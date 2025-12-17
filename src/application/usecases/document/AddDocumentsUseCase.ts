import type {
  IAddDocumentsUseCase,
  AddDocumentsInput,
  AddDocumentsOutput,
} from '../../ports/in/document.js';
import type { IDocumentService } from '../../ports/out/IDocumentService.js';
import { getDocumentService } from '../../services/document/index.js';

// Re-export types from ports
export type { AddDocumentsInput, AddDocumentsOutput };

/**
 * Use Case : Ajouter plusieurs documents en batch
 */
export class AddDocumentsUseCase implements IAddDocumentsUseCase {
  constructor(private readonly documentService: IDocumentService) {}

  async execute(input: AddDocumentsInput): Promise<AddDocumentsOutput> {
    const { contents } = input;

    console.log(`📄 Adding ${contents.length} documents...`);

    const documents = await this.documentService.addDocuments(contents);

    console.log(`✅ ${documents.length} documents added`);

    return { documents, count: documents.length };
  }
}

// Factory avec injection par défaut
export function createAddDocumentsUseCase(
  documentService: IDocumentService = getDocumentService()
): AddDocumentsUseCase {
  return new AddDocumentsUseCase(documentService);
}

// Singleton avec dépendances par défaut
export const addDocumentsUseCase = createAddDocumentsUseCase();
