/**
 * Types pour le service de documents (RAG)
 */

export interface Document {
  id: number;
  content: string;
  embedding: number[] | null;
}

export interface CreateDocumentInput {
  content: string;
  /** Si fourni, utilise cet embedding. Sinon, il sera généré automatiquement */
  embedding?: number[];
}

export interface SearchResult {
  id: number;
  content: string;
  /** Distance cosinus (plus petit = plus similaire) */
  distance: number;
}

export interface SearchOptions {
  /** Nombre maximum de résultats (défaut: 5) */
  limit?: number;
  /** Distance maximale pour filtrer les résultats (optionnel) */
  maxDistance?: number;
}

