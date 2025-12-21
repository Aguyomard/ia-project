import { getDocumentRepository } from '../../../infrastructure/persistence/index.js';
import { getMistralClient } from '../../../infrastructure/external/mistral/index.js';
import type {
  Document,
  Chunk,
  ChunkWithDistance,
  DocumentWithChunks,
  SearchOptions,
} from '../../../domain/document/index.js';
import { EmbeddingGenerationError } from '../../../domain/document/index.js';
import type {
  IDocumentService,
  CreateDocumentInput,
} from '../../ports/out/IDocumentService.js';

export class DocumentService implements IDocumentService {
  // === Documents ===

  async createDocument(input: CreateDocumentInput): Promise<Document> {
    const repository = getDocumentRepository();
    return repository.createDocument(input);
  }

  async getDocument(id: number): Promise<Document> {
    const repository = getDocumentRepository();
    const document = await repository.findDocumentById(id);
    if (!document) {
      throw new Error(`Document not found: ${id}`);
    }
    return document;
  }

  async getDocumentWithChunks(id: number): Promise<DocumentWithChunks> {
    const repository = getDocumentRepository();
    const document = await repository.findDocumentWithChunks(id);
    if (!document) {
      throw new Error(`Document not found: ${id}`);
    }
    return document;
  }

  async listDocuments(limit = 100, offset = 0): Promise<Document[]> {
    const repository = getDocumentRepository();
    return repository.findAllDocuments(limit, offset);
  }

  async countDocuments(): Promise<number> {
    const repository = getDocumentRepository();
    return repository.countDocuments();
  }

  async deleteDocument(id: number): Promise<boolean> {
    const repository = getDocumentRepository();
    return repository.deleteDocument(id);
  }

  // === Chunks ===

  async addChunksToDocument(
    documentId: number,
    contents: string[]
  ): Promise<Chunk[]> {
    if (contents.length === 0) {
      return [];
    }

    // Générer les embeddings en batch
    let embeddings: number[][];
    try {
      const mistral = getMistralClient();
      embeddings = await mistral.generateEmbeddings(contents);
    } catch (error) {
      throw new EmbeddingGenerationError(
        'Failed to generate embeddings',
        error
      );
    }

    // Créer les chunks
    const repository = getDocumentRepository();
    const chunks: Chunk[] = [];

    for (let i = 0; i < contents.length; i++) {
      const chunk = await repository.createChunk({
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
    const repository = getDocumentRepository();
    return repository.countChunks();
  }

  // === Search ===

  async searchByQuery(
    query: string,
    options: SearchOptions = {}
  ): Promise<ChunkWithDistance[]> {
    let queryEmbedding: number[];
    try {
      const mistral = getMistralClient();
      queryEmbedding = await mistral.generateEmbedding(query);
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
    const repository = getDocumentRepository();
    return repository.searchSimilarChunks(embedding, options);
  }
}

let instance: DocumentService | null = null;

export function getDocumentService(): DocumentService {
  if (!instance) {
    instance = new DocumentService();
  }
  return instance;
}

export function resetDocumentService(): void {
  instance = null;
}

export default DocumentService;
