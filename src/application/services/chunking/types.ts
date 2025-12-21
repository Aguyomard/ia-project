/**
 * Options pour le chunking de texte
 */
export interface ChunkingOptions {
  /**
   * Taille maximale de chaque chunk en caractères
   * @default 500
   */
  chunkSize?: number;

  /**
   * Nombre de caractères de chevauchement entre les chunks
   * @default 100
   */
  overlap?: number;

  /**
   * Séparateurs à utiliser pour diviser le texte (par ordre de priorité)
   * @default ['\n\n', '\n', '. ', ' ']
   */
  separators?: string[];
}

/**
 * Représente un chunk de texte avec ses métadonnées
 */
export interface Chunk {
  /** Le contenu du chunk */
  content: string;

  /** Index du chunk dans le document original (0-based) */
  index: number;

  /** Position de début dans le texte original */
  startOffset: number;

  /** Position de fin dans le texte original */
  endOffset: number;
}

/**
 * Résultat du chunking d'un document
 */
export interface ChunkingResult {
  /** Les chunks générés */
  chunks: Chunk[];

  /** Nombre total de chunks */
  totalChunks: number;

  /** Longueur du texte original */
  originalLength: number;
}

/**
 * Options par défaut pour le chunking
 */
export const DEFAULT_CHUNKING_OPTIONS: Required<ChunkingOptions> = {
  chunkSize: 500,
  overlap: 100,
  separators: ['\n\n', '\n', '. ', ' '],
};
