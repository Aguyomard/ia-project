/**
 * Configuration et types pour le service RAG
 */

export const BASE_SYSTEM_PROMPT =
  'Tu es un assistant IA amical et serviable. Tu réponds en français de manière concise et utile.';

export interface RAGConfig {
  /** Nombre max de documents à inclure dans le contexte */
  maxDocuments: number;
  /** Distance maximale pour considérer un document pertinent */
  maxDistance: number;
}

export const DEFAULT_RAG_CONFIG: RAGConfig = {
  maxDocuments: 3,
  maxDistance: 0.7,
};

export interface RAGContext {
  /** Le prompt enrichi avec le contexte documentaire */
  enrichedPrompt: string;
  /** Nombre de documents trouvés */
  documentsFound: number;
  /** Les distances des documents utilisés */
  distances: number[];
}

