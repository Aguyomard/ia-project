import type { Document, DocumentWithDistance } from '../entities/Document.js';

/**
 * Input pour créer un document
 */
export interface CreateDocumentInput {
  content: string;
  embedding?: number[];
  /** ID du document parent si c'est un chunk */
  sourceId?: number;
  /** Index du chunk dans le document original */
  chunkIndex?: number;
}

/**
 * Options de recherche sémantique
 */
export interface SearchOptions {
  /** Nombre maximum de résultats (défaut: 5) */
  limit?: number;
  /** Distance maximale pour filtrer les résultats */
  maxDistance?: number;
  /** Exclure les documents sources (qui n'ont pas d'embedding) */
  excludeSources?: boolean;
}

/**
 * Interface du repository Document (Port)
 * Implémenté par l'infrastructure (Prisma + pgvector, etc.)
 */
export interface IDocumentRepository {
  /**
   * Ajoute un document
   */
  create(input: CreateDocumentInput): Promise<Document>;

  /**
   * Ajoute plusieurs documents
   */
  createMany(contents: string[]): Promise<Document[]>;

  /**
   * Récupère un document par son ID
   */
  findById(id: number): Promise<Document | null>;

  /**
   * Liste les documents avec pagination
   */
  findAll(limit: number, offset: number): Promise<Document[]>;

  /**
   * Compte le nombre total de documents
   */
  count(): Promise<number>;

  /**
   * Supprime un document (et ses chunks si c'est un document source)
   */
  delete(id: number): Promise<boolean>;

  /**
   * Recherche les documents similaires par embedding
   */
  searchSimilar(
    queryEmbedding: number[],
    options?: SearchOptions
  ): Promise<DocumentWithDistance[]>;

  /**
   * Récupère les chunks d'un document source
   */
  findChunksBySourceId(sourceId: number): Promise<Document[]>;

  /**
   * Crée un document source (sans embedding) et retourne son ID
   */
  createSource(content: string): Promise<Document>;
}


    queryEmbedding: number[],
    options?: SearchOptions
  ): Promise<DocumentWithDistance[]>;

  /**
   * Récupère les chunks d'un document source
   */
  findChunksBySourceId(sourceId: number): Promise<Document[]>;

  /**
   * Crée un document source (sans embedding) et retourne son ID
   */
  createSource(content: string): Promise<Document>;
}

