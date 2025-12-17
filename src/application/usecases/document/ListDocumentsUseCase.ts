import type {
  IListDocumentsUseCase,
  ListDocumentsInput,
  ListDocumentsOutput,
} from '../../ports/in/document.js';
import type { IDocumentService } from '../../ports/out/IDocumentService.js';
import { getDocumentService } from '../../services/document/index.js';

export type { ListDocumentsInput, ListDocumentsOutput };

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

export function createListDocumentsUseCase(
  documentService: IDocumentService = getDocumentService()
): ListDocumentsUseCase {
  return new ListDocumentsUseCase(documentService);
}

export const listDocumentsUseCase = createListDocumentsUseCase();
