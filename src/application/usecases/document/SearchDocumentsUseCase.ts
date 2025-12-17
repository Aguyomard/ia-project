import { getDocumentService } from '../../../services/document/index.js';
import type { DocumentWithDistance } from '../../../domain/document/index.js';

export interface SearchDocumentsInput {
  query: string;
  limit?: number;
  maxDistance?: number;
}

export interface SearchDocumentsOutput {
  results: DocumentWithDistance[];
}

/**
 * Use Case : Recherche sémantique dans les documents
 */
export class SearchDocumentsUseCase {
  async execute(input: SearchDocumentsInput): Promise<SearchDocumentsOutput> {
    const { query, limit = 5, maxDistance } = input;

    console.log('🔍 Searching documents:', query);

    const documentService = getDocumentService();
    const results = await documentService.searchByQuery(query, {
      limit,
      maxDistance,
    });

    console.log(`✅ Found ${results.length} results`);

    return { results };
  }
}

export const searchDocumentsUseCase = new SearchDocumentsUseCase();
