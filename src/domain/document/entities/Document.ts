/**
 * Entité Document du domaine
 * Représente un document source (le texte original complet)
 */
export interface Document {
  id: number;
  content: string;
  title?: string | null;
  createdAt?: Date;
}

/**
 * Entité Chunk du domaine
 * Représente un fragment de document avec son embedding
 */
export interface Chunk {
  id: number;
  documentId: number;
  content: string;
  embedding: number[];
  chunkIndex: number;
  startOffset?: number;
  endOffset?: number;
  createdAt?: Date;
}

/**
 * Chunk avec sa distance de similarité (pour les résultats de recherche)
 */
export interface ChunkWithDistance extends Chunk {
  /** Distance cosinus (plus petit = plus similaire) */
  distance: number;
}

/**
 * Document avec ses chunks associés
 */
export interface DocumentWithChunks extends Document {
  chunks: Chunk[];
  totalChunks: number;
}

/**
 * Résultat de recherche enrichi avec infos du document parent
 */
export interface SearchResult {
  chunk: ChunkWithDistance;
  document: Document;
}
