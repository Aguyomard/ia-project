import type {
  Document,
  DocumentWithDistance,
} from '../../../domain/document/index.js';

export interface AddDocumentInput {
  content: string;
}

export interface AddDocumentOutput {
  document: Document;
}

export interface IAddDocumentUseCase {
  execute(input: AddDocumentInput): Promise<AddDocumentOutput>;
}

export interface AddDocumentsInput {
  contents: string[];
}

export interface AddDocumentsOutput {
  documents: Document[];
  count: number;
}

export interface IAddDocumentsUseCase {
  execute(input: AddDocumentsInput): Promise<AddDocumentsOutput>;
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
  document: Document;
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

export interface SearchDocumentsInput {
  query: string;
  limit?: number;
  maxDistance?: number;
}

export interface SearchDocumentsOutput {
  documents: DocumentWithDistance[];
  count: number;
}

export interface ISearchDocumentsUseCase {
  execute(input: SearchDocumentsInput): Promise<SearchDocumentsOutput>;
}

// === Chunking avec overlap ===

export interface ChunkInfo {
  /** Contenu du chunk */
  content: string;
  /** Index du chunk (0-based) */
  index: number;
  /** Position de début dans le document original */
  startOffset: number;
  /** Position de fin dans le document original */
  endOffset: number;
}

export interface AddDocumentWithChunkingInput {
  /** Contenu du document à découper */
  content: string;
  /** Taille maximale de chaque chunk en caractères (défaut: 500) */
  chunkSize?: number;
  /** Chevauchement entre les chunks en caractères (défaut: 100) */
  overlap?: number;
}

export interface AddDocumentWithChunkingOutput {
  /** Documents créés (un par chunk) */
  documents: import('../../../domain/document/index.js').Document[];
  /** Informations sur les chunks générés */
  chunks: ChunkInfo[];
  /** Nombre total de chunks */
  totalChunks: number;
  /** Longueur du document original */
  originalLength: number;
  /** ID du document source (contient le texte original) */
  sourceId?: number;
}

export interface IAddDocumentWithChunkingUseCase {
  execute(
    input: AddDocumentWithChunkingInput
  ): Promise<AddDocumentWithChunkingOutput>;
}
