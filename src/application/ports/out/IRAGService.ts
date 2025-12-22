import type { RAGContext } from '../../services/rag/types.js';

export type { RAGContext };

export interface RAGOptions {
  /** Activer le reranking (défaut: true) */
  useReranking?: boolean;
  /** Activer la reformulation de requête (défaut: true) */
  useQueryRewrite?: boolean;
  /** Activer la recherche hybride vector + keywords (défaut: false) */
  useHybridSearch?: boolean;
  /** Historique de la conversation pour contexte */
  conversationHistory?: string[];
}

export interface IRAGService {
  buildEnrichedPrompt(
    userMessage: string,
    options?: RAGOptions
  ): Promise<RAGContext>;
  getBasePrompt(): string;
}
