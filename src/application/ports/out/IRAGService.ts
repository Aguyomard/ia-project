import type { RAGContext } from '../../services/rag/types.js';

export type { RAGContext };

export interface RAGOptions {
  /** Activer le reranking (défaut: true) */
  useReranking?: boolean;
}

export interface IRAGService {
  buildEnrichedPrompt(
    userMessage: string,
    options?: RAGOptions
  ): Promise<RAGContext>;
  getBasePrompt(): string;
}
