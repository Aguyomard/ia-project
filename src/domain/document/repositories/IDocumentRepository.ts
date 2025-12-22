import type {
  Document,
  Chunk,
  ChunkWithDistance,
  DocumentWithChunks,
} from '../entities/Document.js';

/**
 * Input pour créer un document
 */
export interface CreateDocumentInput {
  content: string;
  title?: string;
}

/**
 * Input pour créer un chunk
 */
export interface CreateChunkInput {
  documentId: number;
  content: string;
  embedding: number[];
  chunkIndex: number;
  startOffset?: number;
  endOffset?: number;
}

/**
 * Options de recherche sémantique
 */
export interface SearchOptions {
  /** Nombre maximum de résultats (défaut: 5) */
  limit?: number;
  /** Distance maximale pour filtrer les résultats */
  maxDistance?: number;
}

/**
 * Résultat de recherche full-text avec score BM25
 */
export interface ChunkWithRank {
  id: number;
  documentId: number;
  documentTitle: string | null;
  content: string;
  chunkIndex: number;
  rank: number;
}

/**
 * Interface du repository Document (Port)
 */
export interface IDocumentRepository {
  // === Documents ===

  /** Crée un document */
  createDocument(input: CreateDocumentInput): Promise<Document>;

  /** Récupère un document par son ID */
  findDocumentById(id: number): Promise<Document | null>;

  /** Liste les documents avec pagination */
  findAllDocuments(limit: number, offset: number): Promise<Document[]>;

  /** Compte le nombre de documents */
  countDocuments(): Promise<number>;

  /** Supprime un document (et ses chunks en cascade) */
  deleteDocument(id: number): Promise<boolean>;

  /** Récupère un document avec ses chunks */
  findDocumentWithChunks(id: number): Promise<DocumentWithChunks | null>;

  // === Chunks ===

  /** Crée un chunk */
  createChunk(input: CreateChunkInput): Promise<Chunk>;

  /** Crée plusieurs chunks en batch */
  createChunks(inputs: CreateChunkInput[]): Promise<Chunk[]>;

  /** Récupère les chunks d'un document */
  findChunksByDocumentId(documentId: number): Promise<Chunk[]>;

  /** Compte le nombre total de chunks */
  countChunks(): Promise<number>;

  /** Recherche les chunks similaires par embedding */
  searchSimilarChunks(
    queryEmbedding: number[],
    options?: SearchOptions
  ): Promise<ChunkWithDistance[]>;

  /** Recherche full-text par mots-clés */
  searchByKeywords(
    query: string,
    limit?: number
  ): Promise<ChunkWithRank[]>;
}
