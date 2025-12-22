import prismaClient from '../config/prisma.js';
import type {
  Document,
  Chunk,
  ChunkWithDistance,
  ChunkWithRank,
  DocumentWithChunks,
  IDocumentRepository,
  CreateDocumentInput,
  CreateChunkInput,
  SearchOptions,
} from '../../domain/document/index.js';
import { DomainError } from '../../domain/shared/index.js';

type PrismaClientType = typeof prismaClient;

class DatabaseError extends DomainError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'DATABASE_ERROR', originalError);
  }
}

/**
 * Repository pour les documents et chunks (pgvector)
 */
export class DocumentRepository implements IDocumentRepository {
  private readonly prisma: PrismaClientType;

  public constructor(prisma: PrismaClientType = prismaClient) {
    this.prisma = prisma;
  }

  // === Documents ===

  public async createDocument(input: CreateDocumentInput): Promise<Document> {
    try {
      const result = await this.prisma.$queryRawUnsafe<
        {
          id: number;
          content: string;
          title: string | null;
          created_at: Date;
        }[]
      >(
        `INSERT INTO documents (content, title)
         VALUES ($1, $2)
         RETURNING id, content, title, created_at`,
        input.content,
        input.title || null
      );

      const doc = result[0];
      return {
        id: Number(doc.id),
        content: doc.content,
        title: doc.title,
        createdAt: doc.created_at,
      };
    } catch (error) {
      throw new DatabaseError('Failed to create document', error);
    }
  }

  public async findDocumentById(id: number): Promise<Document | null> {
    try {
      const result = await this.prisma.$queryRawUnsafe<
        {
          id: number | bigint;
          content: string;
          title: string | null;
          created_at: Date;
        }[]
      >(
        'SELECT id, content, title, created_at FROM documents WHERE id = $1',
        id
      );

      if (result.length === 0) return null;

      const doc = result[0];
      return {
        id: Number(doc.id),
        content: doc.content,
        title: doc.title,
        createdAt: doc.created_at,
      };
    } catch (error) {
      throw new DatabaseError('Failed to get document', error);
    }
  }

  public async findAllDocuments(limit = 100, offset = 0): Promise<Document[]> {
    try {
      const results = await this.prisma.$queryRawUnsafe<
        {
          id: number | bigint;
          content: string;
          title: string | null;
          created_at: Date;
        }[]
      >(
        'SELECT id, content, title, created_at FROM documents ORDER BY id DESC LIMIT $1 OFFSET $2',
        limit,
        offset
      );

      return results.map((r) => ({
        id: Number(r.id),
        content: r.content,
        title: r.title,
        createdAt: r.created_at,
      }));
    } catch (error) {
      throw new DatabaseError('Failed to list documents', error);
    }
  }

  public async countDocuments(): Promise<number> {
    try {
      const result = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(
        'SELECT COUNT(*) as count FROM documents'
      );
      return Number(result[0]?.count ?? 0);
    } catch (error) {
      throw new DatabaseError('Failed to count documents', error);
    }
  }

  public async deleteDocument(id: number): Promise<boolean> {
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

  public async findDocumentWithChunks(
    id: number
  ): Promise<DocumentWithChunks | null> {
    const doc = await this.findDocumentById(id);
    if (!doc) return null;

    const chunks = await this.findChunksByDocumentId(id);

    return {
      ...doc,
      chunks,
      totalChunks: chunks.length,
    };
  }

  // === Chunks ===

  public async createChunk(input: CreateChunkInput): Promise<Chunk> {
    try {
      const embeddingStr = `[${input.embedding.join(',')}]`;

      const result = await this.prisma.$queryRawUnsafe<
        {
          id: number;
          document_id: number;
          content: string;
          chunk_index: number;
          start_offset: number | null;
          end_offset: number | null;
          created_at: Date;
        }[]
      >(
        `INSERT INTO chunks (document_id, content, embedding, chunk_index, start_offset, end_offset)
         VALUES ($1, $2, $3::vector, $4, $5, $6)
         RETURNING id, document_id, content, chunk_index, start_offset, end_offset, created_at`,
        input.documentId,
        input.content,
        embeddingStr,
        input.chunkIndex,
        input.startOffset ?? null,
        input.endOffset ?? null
      );

      const chunk = result[0];
      return {
        id: Number(chunk.id),
        documentId: Number(chunk.document_id),
        content: chunk.content,
        embedding: input.embedding,
        chunkIndex: chunk.chunk_index,
        startOffset: chunk.start_offset ?? undefined,
        endOffset: chunk.end_offset ?? undefined,
        createdAt: chunk.created_at,
      };
    } catch (error) {
      throw new DatabaseError('Failed to create chunk', error);
    }
  }

  public async createChunks(inputs: CreateChunkInput[]): Promise<Chunk[]> {
    const chunks: Chunk[] = [];
    for (const input of inputs) {
      const chunk = await this.createChunk(input);
      chunks.push(chunk);
    }
    return chunks;
  }

  public async findChunksByDocumentId(documentId: number): Promise<Chunk[]> {
    try {
      const results = await this.prisma.$queryRawUnsafe<
        {
          id: number | bigint;
          document_id: number;
          content: string;
          chunk_index: number;
          start_offset: number | null;
          end_offset: number | null;
          created_at: Date;
        }[]
      >(
        `SELECT id, document_id, content, chunk_index, start_offset, end_offset, created_at
         FROM chunks
         WHERE document_id = $1
         ORDER BY chunk_index`,
        documentId
      );

      return results.map((r) => ({
        id: Number(r.id),
        documentId: Number(r.document_id),
        content: r.content,
        embedding: [], // Not loaded for performance
        chunkIndex: r.chunk_index,
        startOffset: r.start_offset ?? undefined,
        endOffset: r.end_offset ?? undefined,
        createdAt: r.created_at,
      }));
    } catch (error) {
      throw new DatabaseError('Failed to get chunks', error);
    }
  }

  public async countChunks(): Promise<number> {
    try {
      const result = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(
        'SELECT COUNT(*) as count FROM chunks'
      );
      return Number(result[0]?.count ?? 0);
    } catch (error) {
      throw new DatabaseError('Failed to count chunks', error);
    }
  }

  public async searchSimilarChunks(
    queryEmbedding: number[],
    options: SearchOptions = {}
  ): Promise<ChunkWithDistance[]> {
    const { limit = 5, maxDistance } = options;
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    try {
      let results: {
        id: number | bigint;
        document_id: number;
        document_title: string | null;
        content: string;
        chunk_index: number;
        distance: number;
      }[];

      if (maxDistance !== undefined) {
        results = await this.prisma.$queryRawUnsafe(
          `SELECT c.id, c.document_id, d.title as document_title, c.content, c.chunk_index, 
                  c.embedding <=> $1::vector AS distance
           FROM chunks c
           JOIN documents d ON c.document_id = d.id
           WHERE c.embedding <=> $1::vector < $2
           ORDER BY distance
           LIMIT $3`,
          embeddingStr,
          maxDistance,
          limit
        );
      } else {
        results = await this.prisma.$queryRawUnsafe(
          `SELECT c.id, c.document_id, d.title as document_title, c.content, c.chunk_index,
                  c.embedding <=> $1::vector AS distance
           FROM chunks c
           JOIN documents d ON c.document_id = d.id
           ORDER BY distance
           LIMIT $2`,
          embeddingStr,
          limit
        );
      }

      return results.map((r) => ({
        id: Number(r.id),
        documentId: Number(r.document_id),
        documentTitle: r.document_title,
        content: r.content,
        embedding: [],
        chunkIndex: r.chunk_index,
        distance: Number(r.distance),
      }));
    } catch (error) {
      throw new DatabaseError('Failed to search chunks', error);
    }
  }

  public async searchByKeywords(
    query: string,
    limit = 10
  ): Promise<ChunkWithRank[]> {
    try {
      const results = await this.prisma.$queryRawUnsafe<
        {
          id: number | bigint;
          document_id: number;
          document_title: string | null;
          content: string;
          chunk_index: number;
          rank: number;
        }[]
      >(
        `SELECT c.id, c.document_id, d.title as document_title, c.content, c.chunk_index,
                ts_rank(c.search_vector, plainto_tsquery('french', $1) || plainto_tsquery('english', $1)) as rank
         FROM chunks c
         JOIN documents d ON c.document_id = d.id
         WHERE c.search_vector @@ (plainto_tsquery('french', $1) || plainto_tsquery('english', $1))
         ORDER BY rank DESC
         LIMIT $2`,
        query,
        limit
      );

      return results.map((r) => ({
        id: Number(r.id),
        documentId: Number(r.document_id),
        documentTitle: r.document_title,
        content: r.content,
        chunkIndex: r.chunk_index,
        rank: Number(r.rank),
      }));
    } catch (error) {
      throw new DatabaseError('Failed to keyword search chunks', error);
    }
  }
}

// Singleton
let instance: DocumentRepository | null = null;

export function getDocumentRepository(
  prisma?: PrismaClientType
): DocumentRepository {
  if (!instance) {
    instance = new DocumentRepository(prisma);
  }
  return instance;
}

export function resetDocumentRepository(): void {
  instance = null;
}
