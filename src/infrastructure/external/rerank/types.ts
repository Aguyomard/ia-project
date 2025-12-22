/**
 * Types pour le service de reranking
 */

export interface RerankConfig {
  /** URL du service de reranking */
  serviceUrl?: string;
  /** Timeout en ms pour les requêtes */
  timeout?: number;
  /** Nombre de résultats à retourner par défaut */
  defaultTopK?: number;
}

export interface RerankDocument {
  /** ID du document/chunk */
  id: number;
  /** Contenu textuel */
  content: string;
}

export interface RerankRequest {
  /** Requête de l'utilisateur */
  query: string;
  /** Documents à reranker */
  documents: RerankDocument[];
  /** Nombre de résultats à retourner */
  top_k: number;
}

export interface RerankResult {
  /** ID du document */
  id: number;
  /** Score de pertinence (plus haut = plus pertinent) */
  score: number;
  /** Contenu du document */
  content: string;
}

export interface RerankResponse {
  /** Résultats triés par pertinence */
  results: RerankResult[];
  /** Modèle utilisé */
  model: string;
}

export interface RerankHealthResponse {
  status: string;
  model: string;
  model_loaded: boolean;
}



