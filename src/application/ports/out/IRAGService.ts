import type { RAGContext } from '../../services/rag/types.js';

export type { RAGContext };

export interface IRAGService {
  buildEnrichedPrompt(userMessage: string): Promise<RAGContext>;
  getBasePrompt(): string;
}
