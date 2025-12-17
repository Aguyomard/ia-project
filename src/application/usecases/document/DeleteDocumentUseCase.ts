import { getDocumentService } from '../../../services/document/index.js';

export interface DeleteDocumentInput {
  id: number;
}

export interface DeleteDocumentOutput {
  success: boolean;
  deleted: boolean;
}

/**
 * Use Case : Supprimer un document
 */
export class DeleteDocumentUseCase {
  async execute(input: DeleteDocumentInput): Promise<DeleteDocumentOutput> {
    const { id } = input;

    const documentService = getDocumentService();
    const deleted = await documentService.deleteDocument(id);

    if (deleted) {
      console.log('🗑️ Document deleted:', id);
    }

    return { success: true, deleted };
  }
}

export const deleteDocumentUseCase = new DeleteDocumentUseCase();

