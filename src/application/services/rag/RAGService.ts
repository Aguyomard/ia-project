import { getDocumentService } from '../document/index.js';
import {
  getRerankClient,
  isRerankConfigured,
} from '../../../infrastructure/external/rerank/index.js';
import {
  BASE_SYSTEM_PROMPT,
  DEFAULT_RAG_CONFIG,
  type RAGConfig,
  type RAGContext,
  type RAGSource,
} from './types.js';
import type { IRAGService, RAGOptions } from '../../ports/out/IRAGService.js';
import type { ChunkWithDistance } from '../../../domain/document/index.js';

/**
 * Convertit une distance cosinus (0-2) en pourcentage de similarité (0-100%)
 * Distance 0 = 100% similaire, Distance 1 = 50%, Distance 2 = 0%
 */
function distanceToSimilarity(distance: number): number {
  return Math.round((1 - distance / 2) * 100);
}

/**
 * Convertit un score de reranking (-∞ à +∞) en pourcentage (0-100%)
 * Les scores sont normalement entre -10 et +10
 */
function rerankScoreToSimilarity(score: number): number {
  // Sigmoid pour normaliser entre 0 et 1, puis en pourcentage
  const normalized = 1 / (1 + Math.exp(-score));
  return Math.round(normalized * 100);
}

export class RAGService implements IRAGService {
  private config: RAGConfig;

  constructor(config: Partial<RAGConfig> = {}) {
    this.config = { ...DEFAULT_RAG_CONFIG, ...config };
  }

  async buildEnrichedPrompt(
    userMessage: string,
    options: RAGOptions = {}
  ): Promise<RAGContext> {
    try {
      const documentService = getDocumentService();
      const chunkCount = await documentService.countChunks();

      if (chunkCount === 0) {
        return this.emptyContext();
      }

      // Déterminer si le reranking est activé (option > config)
      const shouldRerank =
        (options.useReranking ?? this.config.useReranking) &&
        isRerankConfigured();

      // Étape 1: Recherche vectorielle (large net)
      const searchLimit = shouldRerank
        ? this.config.rerankCandidates
        : this.config.maxDocuments;

      const candidates = await documentService.searchByQuery(userMessage, {
        limit: searchLimit,
        maxDistance: this.config.maxDistance,
      });

      if (candidates.length === 0) {
        return this.emptyContext();
      }

      // Étape 2: Reranking si activé et disponible
      let finalChunks: ChunkWithDistance[];
      let sources: RAGSource[];

      if (shouldRerank) {
        const reranked = await this.rerankChunks(userMessage, candidates);
        finalChunks = reranked.chunks;
        sources = reranked.sources;
      } else {
        // Fallback: utiliser les résultats vectoriels directement
        finalChunks = candidates.slice(0, this.config.maxDocuments);
        sources = finalChunks.map((chunk) => ({
          title: chunk.documentTitle || `Document #${chunk.documentId}`,
          similarity: distanceToSimilarity(chunk.distance),
          distance: chunk.distance,
        }));
      }

      if (finalChunks.length === 0) {
        return this.emptyContext();
      }

      // Construire le contexte
      const context = finalChunks
        .map((chunk, i) => `[Document ${i + 1}]\n${chunk.content}`)
        .join('\n\n---\n\n');

      const distances = finalChunks.map((c) => c.distance);

      const enrichedPrompt = `${BASE_SYSTEM_PROMPT}

Tu as accès aux documents suivants pour t'aider à répondre :

${context}

Instructions :
- Utilise ces documents pour répondre si pertinent
- Si l'information n'est pas dans les documents, utilise tes connaissances générales
- Ne mentionne pas explicitement "selon les documents" sauf si l'utilisateur le demande`;

      console.log(
        `📚 RAG: ${finalChunks.length} sources (${sources.map((s) => `${s.title}: ${s.similarity}%`).join(', ')})`
      );

      return {
        enrichedPrompt,
        documentsFound: finalChunks.length,
        distances,
        sources,
      };
    } catch (error) {
      console.error('RAG search failed, using base prompt:', error);
      return this.emptyContext();
    }
  }

  /**
   * Rerank les chunks avec le cross-encoder
   */
  private async rerankChunks(
    query: string,
    chunks: ChunkWithDistance[]
  ): Promise<{ chunks: ChunkWithDistance[]; sources: RAGSource[] }> {
    try {
      const rerankClient = getRerankClient();

      // Vérifier si le service est disponible
      const available = await rerankClient.isAvailable();
      if (!available) {
        console.warn(
          '⚠️ Rerank service not available, using vector search only'
        );
        return this.fallbackToVectorSearch(chunks);
      }

      // Préparer les documents pour le reranking
      const documents = chunks.map((chunk) => ({
        id: chunk.id,
        content: chunk.content,
      }));

      // Appeler le service de reranking
      const results = await rerankClient.rerank(
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
            title:
              originalChunk.documentTitle ||
              `Document #${originalChunk.documentId}`,
            similarity: rerankScoreToSimilarity(result.score),
            distance: originalChunk.distance,
          });
        }
      }

      console.log(
        `🔄 Reranked ${chunks.length} → ${rerankedChunks.length} chunks`
      );

      return { chunks: rerankedChunks, sources };
    } catch (error) {
      console.error('Reranking failed, falling back to vector search:', error);
      return this.fallbackToVectorSearch(chunks);
    }
  }

  /**
   * Fallback vers la recherche vectorielle simple
   */
  private fallbackToVectorSearch(chunks: ChunkWithDistance[]): {
    chunks: ChunkWithDistance[];
    sources: RAGSource[];
  } {
    const limitedChunks = chunks.slice(0, this.config.maxDocuments);
    const sources = limitedChunks.map((chunk) => ({
      title: chunk.documentTitle || `Document #${chunk.documentId}`,
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
