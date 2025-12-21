import type { PrismaClient } from '@prisma/client';
import prismaClient from '../config/prisma.js';
import type {
  Document,
  DocumentWithDistance,
  IDocumentRepository,
  CreateDocumentInput,
  SearchOptions,
} from '../../domain/document/index.js';
import { DomainError } from '../../domain/shared/index.js';

/**
 * Erreur de base de données
 */
class DatabaseError extends DomainError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'DATABASE_ERROR', originalError);
  }
}

/**
 * Repository Prisma pour les documents (pgvector)
 * Implémente IDocumentRepository du domaine
 *
 * Note: Ce repository fait de la persistence pure.
 * Les embeddings doivent être fournis (pas de génération ici).
 */
export class DocumentRepository implements IDocumentRepository {
  private readonly prisma: PrismaClient;

  public constructor(prisma: PrismaClient = prismaClient) {
    this.prisma = prisma;
  }

  public async create(input: CreateDocumentInput): Promise<Document> {
    if (!input.embedding) {
      throw new DatabaseError('Embedding is required for document creation');
    }

    try {
      const embeddingStr = `[${input.embedding.join(',')}]`;

      // Construire la requête selon les champs présents
      const hasSourceId = input.sourceId !== undefined;
      const hasChunkIndex = input.chunkIndex !== undefined;

      let result: {
        id: number;
        content: string;
        source_id: number | null;
        chunk_index: number | null;
      }[];

      if (hasSourceId && hasChunkIndex) {
        result = await this.prisma.$queryRawUnsafe(
          `INSERT INTO documents (content, embedding, source_id, chunk_index)
           VALUES ($1, $2::vector, $3, $4)
           RETURNING id, content, source_id, chunk_index`,
          input.content,
          embeddingStr,
          input.sourceId,
          input.chunkIndex
        );
      } else {
        result = await this.prisma.$queryRawUnsafe(
          `INSERT INTO documents (content, embedding)
           VALUES ($1, $2::vector)
           RETURNING id, content, source_id, chunk_index`,
          input.content,
          embeddingStr
        );
      }

      const doc = result[0];
      return {
        id: Number(doc.id),
        content: doc.content,
        embedding: input.embedding,
        sourceId: doc.source_id ? Number(doc.source_id) : null,
        chunkIndex: doc.chunk_index,
      };
    } catch (error) {
      console.error('[DocumentRepository] Insert error:', error);
      throw new DatabaseError('Failed to add document', error);
    }
  }

  public async createMany(contents: string[]): Promise<Document[]> {
    throw new DatabaseError(
      'createMany requires embeddings - use DocumentService instead'
    );
  }

  public async findById(id: number): Promise<Document | null> {
    try {
      const result = await this.prisma.$queryRawUnsafe<
        {
          id: number | bigint;
          content: string;
          source_id: number | null;
          chunk_index: number | null;
          created_at: Date | null;
        }[]
      >(
        'SELECT id, content, source_id, chunk_index, created_at FROM documents WHERE id = $1',
        id
      );

      if (result.length === 0) {
        return null;
      }

      const doc = result[0];
      return {
        id: Number(doc.id),
        content: doc.content,
        embedding: null,
        sourceId: doc.source_id ? Number(doc.source_id) : null,
        chunkIndex: doc.chunk_index,
        createdAt: doc.created_at ?? undefined,
      };
    } catch (error) {
      throw new DatabaseError('Failed to get document', error);
    }
  }

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

  public async searchSimilar(
    queryEmbedding: number[],
    options: SearchOptions = {}
  ): Promise<DocumentWithDistance[]> {
    const { limit = 5, maxDistance } = options;
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

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

  public async findChunksBySourceId(sourceId: number): Promise<Document[]> {
    try {
      const results = await this.prisma.$queryRawUnsafe<
        {
          id: number | bigint;
          content: string;
          source_id: number;
          chunk_index: number;
        }[]
      >(
        `SELECT id, content, source_id, chunk_index
         FROM documents
         WHERE source_id = $1
         ORDER BY chunk_index`,
        sourceId
      );

      return results.map((r) => ({
        id: Number(r.id),
        content: r.content,
        embedding: null,
        sourceId: Number(r.source_id),
        chunkIndex: r.chunk_index,
      }));
    } catch (error) {
      throw new DatabaseError('Failed to get chunks', error);
    }
  }

  public async createSource(content: string): Promise<Document> {
    try {
      // Crée un document source sans embedding (juste pour garder le contenu original)
      const result = await this.prisma.$queryRawUnsafe<
        { id: number; content: string; created_at: Date }[]
      >(
        `INSERT INTO documents (content, embedding)
         VALUES ($1, NULL)
         RETURNING id, content, created_at`,
        content
      );

      const doc = result[0];
      return {
        id: Number(doc.id),
        content: doc.content,
        embedding: null,
        sourceId: null,
        chunkIndex: null,
        createdAt: doc.created_at,
      };
    } catch (error) {
      throw new DatabaseError('Failed to create source document', error);
    }
  }
}

// Singleton
let instance: DocumentRepository | null = null;

export function getDocumentRepository(
  prisma?: PrismaClient
): DocumentRepository {
  if (!instance) {
    instance = new DocumentRepository(prisma);
  }
  return instance;
}

export function resetDocumentRepository(): void {
  instance = null;
}
