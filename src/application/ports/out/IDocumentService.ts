import type {
  Document,
  DocumentWithDistance,
  CreateDocumentInput,
  SearchOptions,
} from '../../../domain/document/index.js';

export interface IDocumentService {
  addDocument(input: CreateDocumentInput): Promise<Document>;
  addDocuments(contents: string[]): Promise<Document[]>;
  getDocument(id: number): Promise<Document>;
  listDocuments(limit?: number, offset?: number): Promise<Document[]>;
  count(): Promise<number>;
  deleteDocument(id: number): Promise<boolean>;
  searchByQuery(query: string, options?: SearchOptions): Promise<DocumentWithDistance[]>;
  searchSimilar(queryEmbedding: number[], options?: SearchOptions): Promise<DocumentWithDistance[]>;
}
