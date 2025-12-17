import type {
  ISearchDocumentsUseCase,
  SearchDocumentsInput,
  SearchDocumentsOutput,
} from '../../ports/in/document.js';
import type { IDocumentService } from '../../ports/out/IDocumentService.js';
import { getDocumentService } from '../../services/document/index.js';

export type { SearchDocumentsInput, SearchDocumentsOutput };

export class SearchDocumentsUseCase implements ISearchDocumentsUseCase {
  constructor(private readonly documentService: IDocumentService) {}

  async execute(input: SearchDocumentsInput): Promise<SearchDocumentsOutput> {
    const { query, limit = 5, maxDistance } = input;

    const documents = await this.documentService.searchByQuery(query, {
      limit,
      maxDistance,
    });

    return { documents, count: documents.length };
  }
}

export function createSearchDocumentsUseCase(
  documentService: IDocumentService = getDocumentService()
): SearchDocumentsUseCase {
  return new SearchDocumentsUseCase(documentService);
}

export const searchDocumentsUseCase = createSearchDocumentsUseCase();
