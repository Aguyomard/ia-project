import type {
  Document,
  Chunk,
  ChunkWithDistance,
  DocumentWithChunks,
} from '../../../domain/document/index.js';

// === Document CRUD ===

export interface AddDocumentInput {
  content: string;
  title?: string;
}

export interface AddDocumentOutput {
  document: Document;
}

export interface IAddDocumentUseCase {
  execute(input: AddDocumentInput): Promise<AddDocumentOutput>;
}

export interface ListDocumentsInput {
  limit?: number;
  offset?: number;
}

export interface ListDocumentsOutput {
  documents: Document[];
  total: number;
}

export interface IListDocumentsUseCase {
  execute(input: ListDocumentsInput): Promise<ListDocumentsOutput>;
}

export interface GetDocumentInput {
  id: number;
}

export interface GetDocumentOutput {
  document: DocumentWithChunks;
}

export interface IGetDocumentUseCase {
  execute(input: GetDocumentInput): Promise<GetDocumentOutput>;
}

export interface DeleteDocumentInput {
  id: number;
}

export interface DeleteDocumentOutput {
  success: boolean;
  id: number;
}

export interface IDeleteDocumentUseCase {
  execute(input: DeleteDocumentInput): Promise<DeleteDocumentOutput>;
}

// === Search ===

export interface SearchDocumentsInput {
  query: string;
  limit?: number;
  maxDistance?: number;
}

export interface SearchDocumentsOutput {
  results: ChunkWithDistance[];
  count: number;
}

export interface ISearchDocumentsUseCase {
  execute(input: SearchDocumentsInput): Promise<SearchDocumentsOutput>;
}

// === Chunking ===

export interface ChunkInfo {
  content: string;
  index: number;
  startOffset: number;
  endOffset: number;
}

export interface AddDocumentWithChunkingInput {
  content: string;
  chunkSize?: number;
  overlap?: number;
}

export interface AddDocumentWithChunkingOutput {
  document: Document;
  chunks: Chunk[];
  chunkInfos: ChunkInfo[];
  totalChunks: number;
  originalLength: number;
}

export interface IAddDocumentWithChunkingUseCase {
  execute(
    input: AddDocumentWithChunkingInput
  ): Promise<AddDocumentWithChunkingOutput>;
}

// Re-export types
export type { Document, Chunk, ChunkWithDistance, DocumentWithChunks };
