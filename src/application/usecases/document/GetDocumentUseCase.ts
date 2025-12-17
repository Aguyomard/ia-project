import type {
  IGetDocumentUseCase,
  GetDocumentInput,
  GetDocumentOutput,
} from '../../ports/in/document.js';
import type { IDocumentService } from '../../ports/out/IDocumentService.js';
import { getDocumentService } from '../../services/document/index.js';

export type { GetDocumentInput, GetDocumentOutput };

export class GetDocumentUseCase implements IGetDocumentUseCase {
  constructor(private readonly documentService: IDocumentService) {}

  async execute(input: GetDocumentInput): Promise<GetDocumentOutput> {
    const document = await this.documentService.getDocument(input.id);
    return { document };
  }
}

export function createGetDocumentUseCase(
  documentService: IDocumentService = getDocumentService()
): GetDocumentUseCase {
  return new GetDocumentUseCase(documentService);
}

export const getDocumentUseCase = createGetDocumentUseCase();
