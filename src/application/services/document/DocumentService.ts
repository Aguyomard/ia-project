import { getDocumentRepository } from '../../../infrastructure/persistence/index.js';
import { getMistralClient } from '../../../infrastructure/external/mistral/index.js';
import type {
  Document,
  Chunk,
  ChunkWithDistance,
  ChunkWithRank,
  DocumentWithChunks,
  SearchOptions,
} from '../../../domain/document/index.js';
import { EmbeddingGenerationError } from '../../../domain/document/index.js';
import type {
  IDocumentService,
  CreateDocumentInput,
} from '../../ports/out/IDocumentService.js';
import type { DocumentServiceDependencies } from './types.js';

export class DocumentService implements IDocumentService {
  private readonly repository;
  private readonly mistralClient;

  constructor(deps: DocumentServiceDependencies) {
    this.repository = deps.repository;
    this.mistralClient = deps.mistralClient;
  }

  async createDocument(input: CreateDocumentInput): Promise<Document> {
    return this.repository.createDocument(input);
  }

  async getDocument(id: number): Promise<Document> {
    const document = await this.repository.findDocumentById(id);
    if (!document) {
      throw new Error(`Document not found: ${id}`);
    }
    return document;
  }

  async getDocumentWithChunks(id: number): Promise<DocumentWithChunks> {
    const document = await this.repository.findDocumentWithChunks(id);
    if (!document) {
      throw new Error(`Document not found: ${id}`);
    }
    return document;
  }

  async listDocuments(limit = 100, offset = 0): Promise<Document[]> {
    return this.repository.findAllDocuments(limit, offset);
  }

  async countDocuments(): Promise<number> {
    return this.repository.countDocuments();
  }

  async deleteDocument(id: number): Promise<boolean> {
    return this.repository.deleteDocument(id);
  }

  async addChunksToDocument(
    documentId: number,
    contents: string[]
  ): Promise<Chunk[]> {
    if (contents.length === 0) {
      return [];
    }

    let embeddings: number[][];
    try {
      embeddings = await this.mistralClient.generateEmbeddings(contents);
    } catch (error) {
      throw new EmbeddingGenerationError(
        'Failed to generate embeddings',
        error
      );
    }

    const chunks: Chunk[] = [];
    for (let i = 0; i < contents.length; i++) {
      const chunk = await this.repository.createChunk({
        documentId,
        content: contents[i],
        embedding: embeddings[i],
        chunkIndex: i,
      });
      chunks.push(chunk);
    }

    return chunks;
  }

  async countChunks(): Promise<number> {
    return this.repository.countChunks();
  }

  async searchByQuery(
    query: string,
    options: SearchOptions = {}
  ): Promise<ChunkWithDistance[]> {
    let queryEmbedding: number[];
    try {
      queryEmbedding = await this.mistralClient.generateEmbedding(query);
    } catch (error) {
      throw new EmbeddingGenerationError(
        'Failed to generate query embedding',
        error
      );
    }

    return this.searchByEmbedding(queryEmbedding, options);
  }

  async searchByEmbedding(
    embedding: number[],
    options: SearchOptions = {}
  ): Promise<ChunkWithDistance[]> {
    return this.repository.searchSimilarChunks(embedding, options);
  }

  async searchByKeywords(
    query: string,
    limit?: number
  ): Promise<ChunkWithRank[]> {
    return this.repository.searchByKeywords(query, limit);
  }
}

let instance: DocumentService | null = null;

export function getDocumentService(): DocumentService {
  if (!instance) {
    instance = new DocumentService({
      repository: getDocumentRepository(),
      mistralClient: getMistralClient(),
    });
  }
  return instance;
}

export function resetDocumentService(): void {
  instance = null;
}
