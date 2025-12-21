// Entities
export type {
  Document,
  DocumentWithDistance,
  DocumentWithChunks,
} from './entities/Document.js';

// Value Objects
export { Embedding } from './valueObjects/Embedding.js';

// Errors
export {
  DocumentError,
  DocumentNotFoundError,
  EmbeddingGenerationError,
  InvalidDocumentContentError,
} from './errors/DocumentErrors.js';

// Repository Interface
export type {
  IDocumentRepository,
  CreateDocumentInput,
  SearchOptions,
} from './repositories/IDocumentRepository.js';
