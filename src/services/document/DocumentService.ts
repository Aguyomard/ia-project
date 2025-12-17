import type { PrismaClient } from '@prisma/client';
import prismaClient from '../../config/prisma.js';
import { getMistralService } from '../mistral/index.js';
import {
  DocumentNotFoundError,
  DatabaseError,
  EmbeddingError,
} from './errors.js';
import type {
  Document,
  CreateDocumentInput,
  SearchResult,
  SearchOptions,
} from './types.js';

/**
 * Service pour gérer les documents et la recherche sémantique avec pgvector
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
export class DocumentService {
  private readonly prisma: PrismaClient;

  public constructor(prisma: PrismaClient = prismaClient) {
    this.prisma = prisma;
  }

  /**
   * Ajoute un document avec son embedding
   * Si l'embedding n'est pas fourni, il sera généré automatiquement via Mistral
   */
  public async addDocument(input: CreateDocumentInput): Promise<Document> {
    let embedding = input.embedding;

    // Générer l'embedding si non fourni
    if (!embedding) {
      try {
        const mistral = getMistralService();
        embedding = await mistral.generateEmbedding(input.content);
      } catch (error) {
        throw new EmbeddingError('Failed to generate embedding', error);
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
   * Ajoute plusieurs documents en batch (plus efficace)
   */
  public async addDocuments(contents: string[]): Promise<Document[]> {
    if (contents.length === 0) {
      return [];
    }

    // Générer tous les embeddings en batch
    let embeddings: number[][];
    try {
      const mistral = getMistralService();
      embeddings = await mistral.generateEmbeddings(contents);
    } catch (error) {
      throw new EmbeddingError('Failed to generate embeddings', error);
    }

    // Insérer tous les documents
    const documents: Document[] = [];
    for (let i = 0; i < contents.length; i++) {
      const doc = await this.addDocument({
        content: contents[i],
        embedding: embeddings[i],
      });
      documents.push(doc);
    }

    return documents;
  }

  /**
   * Recherche les documents les plus similaires à une requête
   * Utilise la distance cosinus (opérateur <=>)
   */
  public async searchSimilar(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const { limit = 5, maxDistance } = options;

    // Générer l'embedding de la requête
    let queryEmbedding: number[];
    try {
      const mistral = getMistralService();
      queryEmbedding = await mistral.generateEmbedding(query);
    } catch (error) {
      throw new EmbeddingError('Failed to generate query embedding', error);
    }

    return this.searchByEmbedding(queryEmbedding, options);
  }

  /**
   * Recherche les documents les plus similaires à un embedding donné
   * Utile si tu as déjà l'embedding (évite un appel API)
   */
  public async searchByEmbedding(
    embedding: number[],
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const { limit = 5, maxDistance } = options;
    const embeddingStr = `[${embedding.join(',')}]`;

    console.log(
      `[DocumentService] Search with embedding dimension: ${embedding.length}, limit: ${limit}`
    );
    console.log(
      `[DocumentService] Embedding first 3 values:`,
      embedding.slice(0, 3)
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

      console.log(`[DocumentService] Raw results count: ${results.length}`);
      if (results.length === 0) {
        console.log('[DocumentService] DEBUG - Query params:', {
          embeddingLength: embeddingStr.length,
          embeddingStart: embeddingStr.substring(0, 100),
          embeddingEnd: embeddingStr.substring(embeddingStr.length - 50),
          limit,
        });
        // Test direct query to debug
        const testResult = await this.prisma.$queryRawUnsafe<
          { count: bigint }[]
        >('SELECT COUNT(*) as count FROM documents');
        console.log(
          '[DocumentService] Documents count:',
          Number(testResult[0]?.count)
        );
      }

      // Convertir bigint en number
      return results.map((r) => ({
        id: Number(r.id),
        content: r.content,
        distance: Number(r.distance),
      }));
    } catch (error) {
      throw new DatabaseError('Failed to search documents', error);
    }
  }

  /**
   * Récupère un document par son ID
   */
  public async getDocument(id: number): Promise<Document> {
    try {
      const result = await this.prisma.$queryRawUnsafe<
        { id: number | bigint; content: string; embedding: string | null }[]
      >('SELECT id, content, embedding::text FROM documents WHERE id = $1', id);

      if (result.length === 0) {
        throw new DocumentNotFoundError(id);
      }

      const doc = result[0];
      return {
        id: Number(doc.id),
        content: doc.content,
        embedding: null, // On ne parse pas l'embedding ici
      };
    } catch (error) {
      if (error instanceof DocumentNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to get document', error);
    }
  }

  /**
   * Supprime un document
   */
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
   * Liste tous les documents (sans embedding pour la performance)
   */
  public async listDocuments(
    limit = 100,
    offset = 0
  ): Promise<Omit<Document, 'embedding'>[]> {
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
      }));
    } catch (error) {
      throw new DatabaseError('Failed to list documents', error);
    }
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
