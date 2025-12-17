import type {
  IGetDocumentUseCase,
  GetDocumentInput,
  GetDocumentOutput,
} from '../../ports/in/document.js';
import type { IDocumentService } from '../../ports/out/IDocumentService.js';
import { getDocumentService } from '../../services/document/index.js';

// Re-export types from ports
export type { GetDocumentInput, GetDocumentOutput };

/**
 * Use Case : Récupérer un document par son ID
 */
export class GetDocumentUseCase implements IGetDocumentUseCase {
  constructor(private readonly documentService: IDocumentService) {}

  async execute(input: GetDocumentInput): Promise<GetDocumentOutput> {
    const { id } = input;

    const document = await this.documentService.getDocument(id);

    return { document };
  }
}

// Factory avec injection par défaut
export function createGetDocumentUseCase(
  documentService: IDocumentService = getDocumentService()
): GetDocumentUseCase {
  return new GetDocumentUseCase(documentService);
}

// Singleton avec dépendances par défaut
export const getDocumentUseCase = createGetDocumentUseCase();
