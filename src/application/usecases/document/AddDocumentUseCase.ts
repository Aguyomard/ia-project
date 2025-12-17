import type { Document } from '../../../domain/document/index.js';
import { getDocumentService } from '../../../services/document/index.js';

export interface AddDocumentInput {
  content: string;
}

export interface AddDocumentOutput {
  document: Pick<Document, 'id' | 'content'>;
}

/**
 * Use Case : Ajouter un document à la base de connaissances
 */
export class AddDocumentUseCase {
  async execute(input: AddDocumentInput): Promise<AddDocumentOutput> {
    const { content } = input;

    console.log('📄 Adding document:', content.substring(0, 50) + '...');

    const documentService = getDocumentService();
    const document = await documentService.addDocument({ content });

    console.log('✅ Document added:', document.id);

    return {
      document: { id: document.id, content: document.content },
    };
  }
}

export const addDocumentUseCase = new AddDocumentUseCase();

