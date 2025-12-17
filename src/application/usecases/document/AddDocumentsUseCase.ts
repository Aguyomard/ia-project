import type { Document } from '../../../domain/document/index.js';
import { getDocumentService } from '../../../services/document/index.js';

export interface AddDocumentsInput {
  contents: string[];
}

export interface AddDocumentsOutput {
  documents: Pick<Document, 'id' | 'content'>[];
}

/**
 * Use Case : Ajouter plusieurs documents en batch
 */
export class AddDocumentsUseCase {
  async execute(input: AddDocumentsInput): Promise<AddDocumentsOutput> {
    const { contents } = input;

    console.log(`📄 Adding ${contents.length} documents...`);

    const documentService = getDocumentService();
    const documents = await documentService.addDocuments(contents);

    console.log(`✅ ${documents.length} documents added`);

    return {
      documents: documents.map((d) => ({ id: d.id, content: d.content })),
    };
  }
}

export const addDocumentsUseCase = new AddDocumentsUseCase();

