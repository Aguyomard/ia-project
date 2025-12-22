/**
 * Configuration et types pour le service RAG
 */

export const BASE_SYSTEM_PROMPT =
  'Tu es un assistant IA amical et serviable. Tu réponds en français de manière concise et utile.';

export interface RAGConfig {
  /** Nombre max de documents à inclure dans le contexte final */
  maxDocuments: number;
  /** Distance maximale pour considérer un document pertinent */
  maxDistance: number;
  /** Activer le reranking avec cross-encoder */
  useReranking: boolean;
  /** Nombre de candidats à récupérer avant reranking */
  rerankCandidates: number;
}

export const DEFAULT_RAG_CONFIG: RAGConfig = {
  maxDocuments: 3,
  maxDistance: 0.8,
  useReranking: true,
  rerankCandidates: 10,
};

/** Source utilisée pour enrichir la réponse */
export interface RAGSource {
  /** Titre du document */
  title: string;
  /** Score de similarité (0-100%) */
  similarity: number;
  /** Distance brute */
  distance: number;
}

export interface RAGContext {
  /** Le prompt enrichi avec le contexte documentaire */
  enrichedPrompt: string;
  /** Nombre de documents trouvés */
  documentsFound: number;
  /** Les distances des documents utilisés */
  distances: number[];
  /** Sources détaillées pour affichage */
  sources: RAGSource[];
}

