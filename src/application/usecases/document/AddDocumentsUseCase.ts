import type {
  IAddDocumentsUseCase,
  AddDocumentsInput,
  AddDocumentsOutput,
} from '../../ports/in/document.js';
import type { IDocumentService } from '../../ports/out/IDocumentService.js';
import { getDocumentService } from '../../services/document/index.js';

export type { AddDocumentsInput, AddDocumentsOutput };

export class AddDocumentsUseCase implements IAddDocumentsUseCase {
  constructor(private readonly documentService: IDocumentService) {}

  async execute(input: AddDocumentsInput): Promise<AddDocumentsOutput> {
    const documents = await this.documentService.addDocuments(input.contents);
    return { documents, count: documents.length };
  }
}

export function createAddDocumentsUseCase(
  documentService: IDocumentService = getDocumentService()
): AddDocumentsUseCase {
  return new AddDocumentsUseCase(documentService);
}

export const addDocumentsUseCase = createAddDocumentsUseCase();
