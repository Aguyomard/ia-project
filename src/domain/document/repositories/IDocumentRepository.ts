import type { Document, DocumentWithDistance } from '../entities/Document.js';

/**
 * Input pour créer un document
 */
export interface CreateDocumentInput {
  content: string;
  embedding?: number[];
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
   * Supprime un document
   */
  delete(id: number): Promise<boolean>;

  /**
   * Recherche les documents similaires par embedding
   */
  searchSimilar(
    queryEmbedding: number[],
    options?: SearchOptions
  ): Promise<DocumentWithDistance[]>;
}

