import type {
  IAddDocumentUseCase,
  AddDocumentInput,
  AddDocumentOutput,
} from '../../ports/in/document.js';
import type { IDocumentService } from '../../ports/out/IDocumentService.js';
import { getDocumentService } from '../../services/document/index.js';

// Re-export types from ports
export type { AddDocumentInput, AddDocumentOutput };

/**
 * Use Case : Ajouter un document à la base de connaissances
 */
export class AddDocumentUseCase implements IAddDocumentUseCase {
  constructor(private readonly documentService: IDocumentService) {}

  async execute(input: AddDocumentInput): Promise<AddDocumentOutput> {
    const { content } = input;

    console.log('📄 Adding document:', content.substring(0, 50) + '...');

    const document = await this.documentService.addDocument({ content });

    console.log('✅ Document added:', document.id);

    return { document };
  }
}

// Factory avec injection par défaut
export function createAddDocumentUseCase(
  documentService: IDocumentService = getDocumentService()
): AddDocumentUseCase {
  return new AddDocumentUseCase(documentService);
}

// Singleton avec dépendances par défaut
export const addDocumentUseCase = createAddDocumentUseCase();
