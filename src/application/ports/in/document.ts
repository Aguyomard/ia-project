/**
 * Ports primaires (driving) pour les use cases de document
 */

import type { Document, DocumentWithDistance } from '../../../domain/document/index.js';

// ============================================
// AddDocument
// ============================================

export interface AddDocumentInput {
  content: string;
}

export interface AddDocumentOutput {
  document: Document;
}

export interface IAddDocumentUseCase {
  execute(input: AddDocumentInput): Promise<AddDocumentOutput>;
}

// ============================================
// AddDocuments (batch)
// ============================================

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

// ============================================
// ListDocuments
// ============================================

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

// ============================================
// GetDocument
// ============================================

export interface GetDocumentInput {
  id: number;
}

export interface GetDocumentOutput {
  document: Document;
}

export interface IGetDocumentUseCase {
  execute(input: GetDocumentInput): Promise<GetDocumentOutput>;
}

// ============================================
// DeleteDocument
// ============================================

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

// ============================================
// SearchDocuments
// ============================================

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

