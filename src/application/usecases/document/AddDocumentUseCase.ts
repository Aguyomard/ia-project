import type {
  IAddDocumentUseCase,
  AddDocumentInput,
  AddDocumentOutput,
} from '../../ports/in/document.js';
import type { IDocumentService } from '../../ports/out/IDocumentService.js';
import { getDocumentService } from '../../services/document/index.js';

export type { AddDocumentInput, AddDocumentOutput };

export class AddDocumentUseCase implements IAddDocumentUseCase {
  constructor(private readonly documentService: IDocumentService) {}

  async execute(input: AddDocumentInput): Promise<AddDocumentOutput> {
    const document = await this.documentService.addDocument({ content: input.content });
    return { document };
  }
}

export function createAddDocumentUseCase(
  documentService: IDocumentService = getDocumentService()
): AddDocumentUseCase {
  return new AddDocumentUseCase(documentService);
}

export const addDocumentUseCase = createAddDocumentUseCase();
