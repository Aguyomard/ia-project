/**
 * Port secondaire pour le service RAG
 */

export interface RAGContext {
  enrichedPrompt: string;
  documentsFound: number;
  distances: number[];
}

export interface IRAGService {
  /**
   * Construit un system prompt enrichi avec le contexte documentaire
   */
  buildEnrichedPrompt(userMessage: string): Promise<RAGContext>;

  /**
   * Retourne le prompt de base sans enrichissement
   */
  getBasePrompt(): string;
}

