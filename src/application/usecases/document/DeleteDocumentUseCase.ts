import type {
  IDeleteDocumentUseCase,
  DeleteDocumentInput,
  DeleteDocumentOutput,
} from '../../ports/in/document.js';
import type { IDocumentService } from '../../ports/out/IDocumentService.js';
import { getDocumentService } from '../../services/document/index.js';

// Re-export types from ports
export type { DeleteDocumentInput, DeleteDocumentOutput };

/**
 * Use Case : Supprimer un document
 */
export class DeleteDocumentUseCase implements IDeleteDocumentUseCase {
  constructor(private readonly documentService: IDocumentService) {}

  async execute(input: DeleteDocumentInput): Promise<DeleteDocumentOutput> {
    const { id } = input;

    const deleted = await this.documentService.deleteDocument(id);

    if (deleted) {
      console.log('🗑️ Document deleted:', id);
    }

    return { success: deleted, id };
  }
}

// Factory avec injection par défaut
export function createDeleteDocumentUseCase(
  documentService: IDocumentService = getDocumentService()
): DeleteDocumentUseCase {
  return new DeleteDocumentUseCase(documentService);
}

// Singleton avec dépendances par défaut
export const deleteDocumentUseCase = createDeleteDocumentUseCase();
