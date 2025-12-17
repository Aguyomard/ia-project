import type { Document } from '../../../domain/document/index.js';
import { getDocumentService } from '../../../services/document/index.js';

export interface GetDocumentInput {
  id: number;
}

export interface GetDocumentOutput {
  document: Pick<Document, 'id' | 'content'>;
}

/**
 * Use Case : Récupérer un document par son ID
 */
export class GetDocumentUseCase {
  async execute(input: GetDocumentInput): Promise<GetDocumentOutput> {
    const { id } = input;

    const documentService = getDocumentService();
    const document = await documentService.getDocument(id);

    return {
      document: { id: document.id, content: document.content },
    };
  }
}

export const getDocumentUseCase = new GetDocumentUseCase();

