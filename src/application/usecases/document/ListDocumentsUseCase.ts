import type {
  IListDocumentsUseCase,
  ListDocumentsInput,
  ListDocumentsOutput,
} from '../../ports/in/document.js';
import type { IDocumentService } from '../../ports/out/IDocumentService.js';
import { getDocumentService } from '../../services/document/index.js';

// Re-export types from ports
export type { ListDocumentsInput, ListDocumentsOutput };

/**
 * Use Case : Lister les documents avec pagination
 */
export class ListDocumentsUseCase implements IListDocumentsUseCase {
  constructor(private readonly documentService: IDocumentService) {}

  async execute(input: ListDocumentsInput = {}): Promise<ListDocumentsOutput> {
    const { limit = 100, offset = 0 } = input;

    const [documents, total] = await Promise.all([
      this.documentService.listDocuments(limit, offset),
      this.documentService.count(),
    ]);

    return { documents, total };
  }
}

// Factory avec injection par défaut
export function createListDocumentsUseCase(
  documentService: IDocumentService = getDocumentService()
): ListDocumentsUseCase {
  return new ListDocumentsUseCase(documentService);
}

// Singleton avec dépendances par défaut
export const listDocumentsUseCase = createListDocumentsUseCase();
