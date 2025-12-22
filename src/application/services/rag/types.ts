/**
 * Configuration et types pour le service RAG
 */

import type { IRAGLogger } from '../../ports/out/ILogger.js';
import type { IDocumentService } from '../../ports/out/IDocumentService.js';
import type { IQueryRewriterService } from '../../ports/out/IQueryRewriterService.js';
import type { IRerankClient } from '../../ports/out/IRerankClient.js';

/** Dépendances injectables pour RAGService */
export interface RAGServiceDependencies {
  /** Service de documents (défaut: DocumentService singleton) */
  documentService?: IDocumentService;
  /** Service de réécriture de requêtes (défaut: QueryRewriterService singleton) */
  queryRewriterService?: IQueryRewriterService;
  /** Client de reranking (défaut: RerankClient singleton) */
  rerankClient?: IRerankClient;
  /** Logger injectable (défaut: ConsoleRAGLogger) */
  logger?: IRAGLogger;
  /** Configuration partielle (défaut: DEFAULT_RAG_CONFIG) */
  config?: Partial<RAGConfig>;
}

export const BASE_SYSTEM_PROMPT =
  'Tu es un assistant IA amical et serviable. Tu réponds en français de manière concise et utile.';

/**
 * Template pour le prompt enrichi avec le contexte documentaire
 * @param context - Le contenu des documents formatés
 * @returns Le prompt système complet avec instructions RAG
 */
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

/** Résultat du traitement des chunks (reranking ou fallback) */
export interface ChunksWithSources<T = unknown> {
  /** Les chunks sélectionnés */
  chunks: T[];
  /** Les sources correspondantes */
  sources: RAGSource[];
}
