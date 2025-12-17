import type {
  IDeleteDocumentUseCase,
  DeleteDocumentInput,
  DeleteDocumentOutput,
} from '../../ports/in/document.js';
import type { IDocumentService } from '../../ports/out/IDocumentService.js';
import { getDocumentService } from '../../services/document/index.js';

export type { DeleteDocumentInput, DeleteDocumentOutput };

export class DeleteDocumentUseCase implements IDeleteDocumentUseCase {
  constructor(private readonly documentService: IDocumentService) {}

  async execute(input: DeleteDocumentInput): Promise<DeleteDocumentOutput> {
    const success = await this.documentService.deleteDocument(input.id);
    return { success, id: input.id };
  }
}

export function createDeleteDocumentUseCase(
  documentService: IDocumentService = getDocumentService()
): DeleteDocumentUseCase {
  return new DeleteDocumentUseCase(documentService);
}

export const deleteDocumentUseCase = createDeleteDocumentUseCase();
