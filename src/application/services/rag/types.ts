import type { IRAGLogger } from '../../ports/out/ILogger.js';
import type { IDocumentService } from '../../ports/out/IDocumentService.js';
import type { IQueryRewriterService } from '../../ports/out/IQueryRewriterService.js';
import type { IRerankClient } from '../../ports/out/IRerankClient.js';
import type { HybridSearchService } from './HybridSearchService.js';

export interface RAGServiceDependencies {
  documentService: IDocumentService;
  queryRewriterService: IQueryRewriterService;
  rerankClient: IRerankClient;
  hybridSearchService: HybridSearchService;
  logger: IRAGLogger;
  config?: Partial<RAGConfig>;
}

export const BASE_SYSTEM_PROMPT =
  'Tu es un assistant IA amical et serviable. Tu réponds en français de manière concise et utile.';

export const buildRAGPrompt = (
  context: string
): string => `${BASE_SYSTEM_PROMPT}

Tu as accès aux documents suivants pour t'aider à répondre :

${context}

Instructions :
- Utilise ces documents pour répondre si pertinent
- Si l'information n'est pas dans les documents, utilise tes connaissances générales
- Ne mentionne pas explicitement "selon les documents" sauf si l'utilisateur le demande`;

export interface RAGConfig {
  maxDocuments: number;
  maxDistance: number;
  useReranking: boolean;
  useHybridSearch: boolean;
  rerankCandidates: number;
}

export const DEFAULT_RAG_CONFIG: RAGConfig = {
  maxDocuments: 3,
  maxDistance: 0.8,
  useReranking: true,
  useHybridSearch: true,
  rerankCandidates: 10,
};

export interface RAGSource {
  title: string;
  similarity: number;
  distance: number;
}

export interface RAGContext {
  enrichedPrompt: string;
  documentsFound: number;
  distances: number[];
  sources: RAGSource[];
}

export interface ChunksWithSources<T = unknown> {
  chunks: T[];
  sources: RAGSource[];
}

// === Hybrid Search ===

export interface HybridSearchResult {
  id: number;
  documentId: number;
  documentTitle: string | null;
  content: string;
  chunkIndex: number;
  vectorRank?: number;
  keywordRank?: number;
  rrfScore: number;
  distance?: number;
}

export interface HybridSearchOptions {
  limit?: number;
  maxDistance?: number;
  vectorWeight?: number;
  keywordWeight?: number;
  rrfK?: number;
}

export const DEFAULT_RRF_K = 60;
export const DEFAULT_VECTOR_WEIGHT = 1.0;
export const DEFAULT_KEYWORD_WEIGHT = 1.0;
