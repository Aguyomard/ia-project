import type {
  ISearchDocumentsUseCase,
  SearchDocumentsInput,
  SearchDocumentsOutput,
} from '../../ports/in/document.js';
import type { IDocumentService } from '../../ports/out/IDocumentService.js';
import { getDocumentService } from '../../services/document/index.js';

// Re-export types from ports
export type { SearchDocumentsInput, SearchDocumentsOutput };

/**
 * Use Case : Recherche sémantique dans les documents
 */
export class SearchDocumentsUseCase implements ISearchDocumentsUseCase {
  constructor(private readonly documentService: IDocumentService) {}

  async execute(input: SearchDocumentsInput): Promise<SearchDocumentsOutput> {
    const { query, limit = 5, maxDistance } = input;

    console.log('🔍 Searching documents:', query);

    const documents = await this.documentService.searchByQuery(query, {
      limit,
      maxDistance,
    });

    console.log(`✅ Found ${documents.length} results`);

    return { documents, count: documents.length };
  }
}

// Factory avec injection par défaut
export function createSearchDocumentsUseCase(
  documentService: IDocumentService = getDocumentService()
): SearchDocumentsUseCase {
  return new SearchDocumentsUseCase(documentService);
}

// Singleton avec dépendances par défaut
export const searchDocumentsUseCase = createSearchDocumentsUseCase();
