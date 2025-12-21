/**
 * Entité Document du domaine
 */
export interface Document {
  id: number;
  content: string;
  embedding: number[] | null;
  createdAt?: Date;
  /** ID du document parent si c'est un chunk (null sinon) */
  sourceId?: number | null;
  /** Index du chunk dans le document original (0-based) */
  chunkIndex?: number | null;
}

/**
 * Document avec sa distance de similarité (pour les résultats de recherche)
 */
export interface DocumentWithDistance extends Document {
  /** Distance cosinus (plus petit = plus similaire) */
  distance: number;
}

/**
 * Représente un document source avec ses chunks associés
 */
export interface DocumentWithChunks extends Document {
  /** Les chunks de ce document */
  chunks: Document[];
  /** Nombre total de chunks */
  totalChunks: number;
}


  distance: number;
}

/**
 * Représente un document source avec ses chunks associés
 */
export interface DocumentWithChunks extends Document {
  /** Les chunks de ce document */
  chunks: Document[];
  /** Nombre total de chunks */
  totalChunks: number;
}

