import { getDocumentService } from '../document/index.js';
import { getQueryRewriterService } from '../queryRewriter/index.js';
import {
  getRerankClient,
  isRerankConfigured,
} from '../../../infrastructure/external/rerank/index.js';
import {
  BASE_SYSTEM_PROMPT,
  buildRAGPrompt,
  DEFAULT_RAG_CONFIG,
  type ChunksWithSources,
  type RAGConfig,
  type RAGContext,
  type RAGServiceDependencies,
  type RAGSource,
} from './types.js';
import {
  distanceToSimilarity,
  getChunkTitle,
  rerankScoreToSimilarity,
} from './utils.js';
import { createRAGLogger } from '../../../infrastructure/logging/index.js';
import type { IRAGService, RAGOptions } from '../../ports/out/IRAGService.js';
import type { IRAGLogger } from '../../ports/out/ILogger.js';
import type { IDocumentService } from '../../ports/out/IDocumentService.js';
import type { IQueryRewriterService } from '../../ports/out/IQueryRewriterService.js';
import type { IRerankClient } from '../../ports/out/IRerankClient.js';
import type { ChunkWithDistance } from '../../../domain/document/index.js';

export class RAGService implements IRAGService {
  private readonly config: RAGConfig;
  private readonly logger: IRAGLogger;
  private readonly documentService: IDocumentService;
  private readonly queryRewriterService: IQueryRewriterService;
  private readonly rerankClient: IRerankClient;

  constructor(deps: RAGServiceDependencies = {}) {
    this.config = { ...DEFAULT_RAG_CONFIG, ...deps.config };
    this.logger = deps.logger ?? createRAGLogger();
    this.documentService = deps.documentService ?? getDocumentService();
    this.queryRewriterService =
      deps.queryRewriterService ?? getQueryRewriterService();
    this.rerankClient = deps.rerankClient ?? getRerankClient();
  }

  async buildEnrichedPrompt(
    userMessage: string,
    options: RAGOptions = {}
  ): Promise<RAGContext> {
    try {
      // Vérifier qu'il y a des documents
      const chunkCount = await this.documentService.countChunks();
      if (chunkCount === 0) {
        return this.emptyContext();
      }

      // Étape 1: Query Rewriting
      const searchQuery = await this.rewriteQueryIfEnabled(
        userMessage,
        options
      );

      // Étape 2: Recherche vectorielle
      const shouldRerank = this.shouldUseReranking(options);
      const candidates = await this.searchCandidates(searchQuery, shouldRerank);
      if (candidates.length === 0) {
        return this.emptyContext();
      }

      // Étape 3: Reranking ou fallback
      const { chunks, sources } = await this.processChunks(
        searchQuery,
        candidates,
        shouldRerank
      );
      if (chunks.length === 0) {
        return this.emptyContext();
      }

      // Étape 4: Construire le prompt enrichi
      return this.buildContextFromChunks(chunks, sources);
    } catch (error) {
      this.logger.error('RAG search failed, using base prompt:', error);
      return this.emptyContext();
    }
  }

  /**
   * Reformule la requête si l'option est activée
   */
  private async rewriteQueryIfEnabled(
    userMessage: string,
    options: RAGOptions
  ): Promise<string> {
    const shouldRewrite = options.useQueryRewrite ?? true;
    if (!shouldRewrite) {
      return userMessage;
    }

    try {
      const rewriteResult = await this.queryRewriterService.rewrite(
        userMessage,
        options.conversationHistory ?? []
      );
      return rewriteResult.rewrittenQuery;
    } catch (error) {
      this.logger.warn(`Query rewrite failed, using original query: ${error}`);
      return userMessage;
    }
  }

  /**
   * Détermine si le reranking doit être utilisé
   */
  private shouldUseReranking(options: RAGOptions): boolean {
    return (
      (options.useReranking ?? this.config.useReranking) && isRerankConfigured()
    );
  }

  /**
   * Recherche les candidats via recherche vectorielle
   */
  private async searchCandidates(
    searchQuery: string,
    shouldRerank: boolean
  ): Promise<ChunkWithDistance[]> {
    const searchLimit = shouldRerank
      ? this.config.rerankCandidates
      : this.config.maxDocuments;

    return this.documentService.searchByQuery(searchQuery, {
      limit: searchLimit,
      maxDistance: this.config.maxDistance,
    });
  }

  /**
   * Traite les chunks : reranking si activé, sinon fallback vectoriel
   */
  private async processChunks(
    searchQuery: string,
    candidates: ChunkWithDistance[],
    shouldRerank: boolean
  ): Promise<ChunksWithSources<ChunkWithDistance>> {
    if (shouldRerank) {
      return this.rerankChunks(searchQuery, candidates);
    }
    return this.fallbackToVectorSearch(candidates);
  }

  /**
   * Construit le contexte RAG à partir des chunks sélectionnés
   */
  private buildContextFromChunks(
    chunks: ChunkWithDistance[],
    sources: RAGSource[]
  ): RAGContext {
    const context = chunks
      .map((chunk, i) => `[Document ${i + 1}]\n${chunk.content}`)
      .join('\n\n---\n\n');

    const enrichedPrompt = buildRAGPrompt(context);

    this.logger.sources(
      chunks.length,
      sources.map((s) => `${s.title}: ${s.similarity}%`).join(', ')
    );

    return {
      enrichedPrompt,
      documentsFound: chunks.length,
      distances: chunks.map((c) => c.distance),
      sources,
    };
  }

  /**
   * Rerank les chunks avec le cross-encoder
   */
  private async rerankChunks(
    query: string,
    chunks: ChunkWithDistance[]
  ): Promise<ChunksWithSources<ChunkWithDistance>> {
    try {
      // Vérifier si le service est disponible
      const available = await this.rerankClient.isAvailable();
      if (!available) {
        this.logger.warn(
          'Rerank service not available, using vector search only'
        );
        return this.fallbackToVectorSearch(chunks);
      }

      // Préparer les documents pour le reranking
      const documents = chunks.map((chunk) => ({
        id: chunk.id,
        content: chunk.content,
      }));

      // Appeler le service de reranking
      const results = await this.rerankClient.rerank(
        query,
        documents,
        this.config.maxDocuments
      );

      // Mapper les résultats aux chunks originaux
      const rerankedChunks: ChunkWithDistance[] = [];
      const sources: RAGSource[] = [];

      for (const result of results) {
        const originalChunk = chunks.find((c) => c.id === result.id);
        if (originalChunk) {
          rerankedChunks.push(originalChunk);
          sources.push({
            title: getChunkTitle(originalChunk),
            similarity: rerankScoreToSimilarity(result.score),
            distance: originalChunk.distance,
          });
        }
      }

      this.logger.rerank(chunks.length, rerankedChunks.length);

      return { chunks: rerankedChunks, sources };
    } catch (error) {
      this.logger.error(
        'Reranking failed, falling back to vector search',
        error
      );
      return this.fallbackToVectorSearch(chunks);
    }
  }

  /**
   * Fallback vers la recherche vectorielle simple
   */
  private fallbackToVectorSearch(
    chunks: ChunkWithDistance[]
  ): ChunksWithSources<ChunkWithDistance> {
    const limitedChunks = chunks.slice(0, this.config.maxDocuments);
    const sources = limitedChunks.map((chunk) => ({
      title: getChunkTitle(chunk),
      similarity: distanceToSimilarity(chunk.distance),
      distance: chunk.distance,
    }));
    return { chunks: limitedChunks, sources };
  }

  /**
   * Retourne un contexte vide
   */
  private emptyContext(): RAGContext {
    return {
      enrichedPrompt: BASE_SYSTEM_PROMPT,
      documentsFound: 0,
      distances: [],
      sources: [],
    };
  }

  getBasePrompt(): string {
    return BASE_SYSTEM_PROMPT;
  }
}
