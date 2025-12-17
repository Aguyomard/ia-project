export interface RAGContext {
  enrichedPrompt: string;
  documentsFound: number;
  distances: number[];
}

export interface IRAGService {
  buildEnrichedPrompt(userMessage: string): Promise<RAGContext>;
  getBasePrompt(): string;
}
