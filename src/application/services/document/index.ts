export {
  DocumentService,
  getDocumentService,
  resetDocumentService,
} from './DocumentService.js';

export type { DocumentServiceDependencies } from './types.js';

export type {
  Document,
  ChunkWithDistance,
  IDocumentRepository,
  CreateDocumentInput,
  SearchOptions,
} from '../../../domain/document/index.js';

export {
  DocumentError,
  DocumentNotFoundError,
  EmbeddingGenerationError,
  InvalidDocumentContentError,
} from '../../../domain/document/index.js';

export { Embedding } from '../../../domain/document/index.js';
