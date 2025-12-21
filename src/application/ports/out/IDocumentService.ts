import type {
  Document,
  Chunk,
  ChunkWithDistance,
  DocumentWithChunks,
  SearchOptions,
} from '../../../domain/document/index.js';

export interface CreateDocumentInput {
  content: string;
  title?: string;
}

export interface IDocumentService {
  // === Documents ===
  createDocument(input: CreateDocumentInput): Promise<Document>;
  getDocument(id: number): Promise<Document>;
  getDocumentWithChunks(id: number): Promise<DocumentWithChunks>;
  listDocuments(limit?: number, offset?: number): Promise<Document[]>;
  countDocuments(): Promise<number>;
  deleteDocument(id: number): Promise<boolean>;

  // === Chunks ===
  addChunksToDocument(
    documentId: number,
    contents: string[]
  ): Promise<Chunk[]>;
  countChunks(): Promise<number>;

  // === Search ===
  searchByQuery(
    query: string,
    options?: SearchOptions
  ): Promise<ChunkWithDistance[]>;
  searchByEmbedding(
    embedding: number[],
    options?: SearchOptions
  ): Promise<ChunkWithDistance[]>;
}
