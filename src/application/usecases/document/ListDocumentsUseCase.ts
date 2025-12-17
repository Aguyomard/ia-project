import type { Document } from '../../../domain/document/index.js';
import { getDocumentService } from '../../../services/document/index.js';

export interface ListDocumentsInput {
  limit?: number;
  offset?: number;
}

export interface ListDocumentsOutput {
  documents: Document[];
  total: number;
}

/**
 * Use Case : Lister les documents avec pagination
 */
export class ListDocumentsUseCase {
  async execute(input: ListDocumentsInput = {}): Promise<ListDocumentsOutput> {
    const { limit = 100, offset = 0 } = input;

    const documentService = getDocumentService();
    const [documents, total] = await Promise.all([
      documentService.listDocuments(limit, offset),
      documentService.count(),
    ]);

    return { documents, total };
  }
}

export const listDocumentsUseCase = new ListDocumentsUseCase();

