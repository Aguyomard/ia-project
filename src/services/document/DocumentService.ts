import type { PrismaClient } from '@prisma/client';
import prismaClient from '../../config/prisma.js';
import { getMistralService } from '../mistral/index.js';
.import type {
  Document,
  DocumentWithDistance,
  IDocumentRepository,
  CreateDocumentInput,
  SearchOptions,
} from '../../domain/document/index.js';
import {
  DocumentNotFoundError,
  EmbeddingGenerationError,
} from '../../domain/document/index.js';
import { DomainError } from '../../domain/shared/index.js';

/**
 * Erreur de base de données spécifique au service
 */
class DatabaseError extends DomainError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'DATABASE_ERROR', originalError);
  }
}

/**
 * Service pour gérer les documents et la recherche sémantique avec pgvector
 * Implémente IDocumentRepository du domaine
 *
 * @example
 * ```ts
 * const service = getDocumentService();
 *
 * // Ajouter un document (l'embedding est généré automatiquement)
 * await service.addDocument({ content: 'Guide Docker: comment configurer...' });
 *
 * // Rechercher des documents similaires
 * const results = await service.searchSimilar('comment installer Docker ?');
 * ```
 */
export class DocumentService implements IDocumentRepository {
  private readonly prisma: PrismaClient;

  public constructor(prisma: PrismaClient = prismaClient) {
    this.prisma = prisma;
  }

  /**
   * Ajoute un document avec son embedding
   * Si l'embedding n'est pas fourni, il sera généré automatiquement via Mistral
   */
  public async create(input: CreateDocumentInput): Promise<Document> {
    let embedding = input.embedding;

    // Générer l'embedding si non fourni
    if (!embedding) {
      try {
        const mistral = getMistralService();
        embedding = await mistral.generateEmbedding(input.content);
      } catch (error) {
        throw new EmbeddingGenerationError(
          'Failed to generate embedding',
          error
        );
      }
    }

    try {
      const embeddingStr = `[${embedding.join(',')}]`;

      // Utiliser $queryRawUnsafe car Prisma ne supporte pas nativement le type vector
      const result = await this.prisma.$queryRawUnsafe<
        { id: number; content: string }[]
      >(
        `INSERT INTO documents (content, embedding)
         VALUES ($1, $2::vector)
         RETURNING id, content`,
        input.content,
        embeddingStr
      );

      const doc = result[0];
      return {
        id: Number(doc.id),
        content: doc.content,
        embedding: embedding,
      };
    } catch (error) {
      console.error('[DocumentService] Insert error:', error);
      throw new DatabaseError('Failed to add document', error);
    }
  }

  /**
   * Alias pour compatibilité
   */
  public async addDocument(input: CreateDocumentInput): Promise<Document> {
    return this.create(input);
  }

  /**
   * Ajoute plusieurs documents en batch (plus efficace)
   */
  public async createMany(contents: string[]): Promise<Document[]> {
    if (contents.length === 0) {
      return [];
    }

    // Générer tous les embeddings en batch
    let embeddings: number[][];
    try {
      const mistral = getMistralService();
      embeddings = await mistral.generateEmbeddings(contents);
    } catch (error) {
      throw new EmbeddingGenerationError(
        'Failed to generate embeddings',
        error
      );
    }

    // Insérer tous les documents
    const documents: Document[] = [];
    for (let i = 0; i < contents.length; i++) {
      const doc = await this.create({
        content: contents[i],
        embedding: embeddings[i],
      });
      documents.push(doc);
    }

    return documents;
  }

  /**
   * Alias pour compatibilité
   */
  public async addDocuments(contents: string[]): Promise<Document[]> {
    return this.createMany(contents);
  }

  /**
   * Récupère un document par son ID
   */
  public async findById(id: number): Promise<Document | null> {
    try {
      const result = await this.prisma.$queryRawUnsafe<
        { id: number | bigint; content: string; embedding: string | null }[]
      >('SELECT id, content, embedding::text FROM documents WHERE id = $1', id);

      if (result.length === 0) {
        return null;
      }

      const doc = result[0];
      return {
        id: Number(doc.id),
        content: doc.content,
        embedding: null, // On ne parse pas l'embedding ici
      };
    } catch (error) {
      throw new DatabaseError('Failed to get document', error);
    }
  }

  /**
   * Récupère un document par son ID (throw si non trouvé)
   * @throws {DocumentNotFoundError} Si le document n'existe pas
   */
  public async getDocument(id: number): Promise<Document> {
    const document = await this.findById(id);
    if (!document) {
      throw new DocumentNotFoundError(id);
    }
    return document;
  }

  /**
   * Liste tous les documents (sans embedding pour la performance)
   */
  public async findAll(limit = 100, offset = 0): Promise<Document[]> {
    try {
      const results = await this.prisma.$queryRawUnsafe<
        { id: number | bigint; content: string }[]
      >(
        'SELECT id, content FROM documents ORDER BY id DESC LIMIT $1 OFFSET $2',
        limit,
        offset
      );

      return results.map((r) => ({
        id: Number(r.id),
        content: r.content,
        embedding: null,
      }));
    } catch (error) {
      throw new DatabaseError('Failed to list documents', error);
    }
  }

  /**
   * Alias pour compatibilité
   */
  public async listDocuments(limit = 100, offset = 0): Promise<Document[]> {
    return this.findAll(limit, offset);
  }

  /**
   * Compte le nombre total de documents
   */
  public async count(): Promise<number> {
    try {
      const result = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(
        'SELECT COUNT(*) as count FROM documents'
      );
      return Number(result[0]?.count ?? 0);
    } catch (error) {
      throw new DatabaseError('Failed to count documents', error);
    }
  }

  /**
   * Supprime un document
   */
  public async delete(id: number): Promise<boolean> {
    try {
      const result = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `WITH deleted AS (
          DELETE FROM documents WHERE id = $1 RETURNING id
        )
        SELECT COUNT(*) as count FROM deleted`,
        id
      );

      return Number(result[0]?.count) > 0;
    } catch (error) {
      throw new DatabaseError('Failed to delete document', error);
    }
  }

  /**
   * Alias pour compatibilité
   */
  public async deleteDocument(id: number): Promise<boolean> {
    return this.delete(id);
  }

  /**
   * Recherche les documents les plus similaires à un embedding donné
   */
  public async searchSimilar(
    queryEmbedding: number[],
    options: SearchOptions = {}
  ): Promise<DocumentWithDistance[]> {
    const { limit = 5, maxDistance } = options;
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    console.log(
      `[DocumentService] Search with embedding dimension: ${queryEmbedding.length}, limit: ${limit}`
    );

    try {
      let results: { id: number | bigint; content: string; distance: number }[];

      if (maxDistance !== undefined) {
        results = await this.prisma.$queryRawUnsafe(
          `SELECT id, content, embedding <=> $1::vector AS distance
           FROM documents
           WHERE embedding <=> $1::vector < $2
           ORDER BY distance
           LIMIT $3`,
          embeddingStr,
          maxDistance,
          limit
        );
      } else {
        results = await this.prisma.$queryRawUnsafe(
          `SELECT id, content, embedding <=> $1::vector AS distance
           FROM documents
           ORDER BY distance
           LIMIT $2`,
          embeddingStr,
          limit
        );
      }

      console.log(`[DocumentService] Found ${results.length} results`);

      // Convertir bigint en number
      return results.map((r) => ({
        id: Number(r.id),
        content: r.content,
        embedding: null,
        distance: Number(r.distance),
      }));
    } catch (error) {
      throw new DatabaseError('Failed to search documents', error);
    }
  }

  /**
   * Recherche les documents les plus similaires à une requête texte
   * Génère l'embedding automatiquement
   */
  public async searchByQuery(
    query: string,
    options: SearchOptions = {}
  ): Promise<DocumentWithDistance[]> {
    // Générer l'embedding de la requête
    let queryEmbedding: number[];
    try {
      const mistral = getMistralService();
      queryEmbedding = await mistral.generateEmbedding(query);
    } catch (error) {
      throw new EmbeddingGenerationError(
        'Failed to generate query embedding',
        error
      );
    }

    return this.searchSimilar(queryEmbedding, options);
  }
}

// ============================================
// Singleton
// ============================================

let instance: DocumentService | null = null;

export function getDocumentService(prisma?: PrismaClient): DocumentService {
  if (!instance) {
    instance = new DocumentService(prisma);
  }
  return instance;
}

export function resetDocumentService(): void {
  instance = null;
}

export default DocumentService;
