import { getDocumentRepository } from '../../../infrastructure/persistence/index.js';
import { getMistralClient } from '../../../infrastructure/external/mistral/index.js';
import type {
  Document,
  DocumentWithDistance,
  CreateDocumentInput,
  SearchOptions,
} from '../../../domain/document/index.js';
import { EmbeddingGenerationError } from '../../../domain/document/index.js';
import type { IDocumentService } from '../../ports/out/IDocumentService.js';

export class DocumentService implements IDocumentService {
  async addDocument(input: CreateDocumentInput): Promise<Document> {
    let embedding = input.embedding;

    if (!embedding) {
      try {
        const mistral = getMistralClient();
        embedding = await mistral.generateEmbedding(input.content);
      } catch (error) {
        throw new EmbeddingGenerationError('Failed to generate embedding', error);
      }
    }

    const repository = getDocumentRepository();
    return repository.create({ content: input.content, embedding });
  }

  async addDocuments(contents: string[]): Promise<Document[]> {
    if (contents.length === 0) {
      return [];
    }

    let embeddings: number[][];
    try {
      const mistral = getMistralClient();
      embeddings = await mistral.generateEmbeddings(contents);
    } catch (error) {
      throw new EmbeddingGenerationError('Failed to generate embeddings', error);
    }

    const repository = getDocumentRepository();
    const documents: Document[] = [];
    for (let i = 0; i < contents.length; i++) {
      const doc = await repository.create({
        content: contents[i],
        embedding: embeddings[i],
      });
      documents.push(doc);
    }

    return documents;
  }

  async getDocument(id: number): Promise<Document> {
    const repository = getDocumentRepository();
    const document = await repository.findById(id);
    if (!document) {
      throw new Error(`Document not found: ${id}`);
    }
    return document;
  }

  async listDocuments(limit = 100, offset = 0): Promise<Document[]> {
    const repository = getDocumentRepository();
    return repository.findAll(limit, offset);
  }

  async count(): Promise<number> {
    const repository = getDocumentRepository();
    return repository.count();
  }

  async deleteDocument(id: number): Promise<boolean> {
    const repository = getDocumentRepository();
    return repository.delete(id);
  }

  async searchByQuery(query: string, options: SearchOptions = {}): Promise<DocumentWithDistance[]> {
    let queryEmbedding: number[];
    try {
      const mistral = getMistralClient();
      queryEmbedding = await mistral.generateEmbedding(query);
    } catch (error) {
      throw new EmbeddingGenerationError('Failed to generate query embedding', error);
    }

    const repository = getDocumentRepository();
    return repository.searchSimilar(queryEmbedding, options);
  }

  async searchSimilar(
    queryEmbedding: number[],
    options: SearchOptions = {}
  ): Promise<DocumentWithDistance[]> {
    const repository = getDocumentRepository();
    return repository.searchSimilar(queryEmbedding, options);
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
