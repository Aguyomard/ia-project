// Entities
export type {
  Document,
  Chunk,
  ChunkWithDistance,
  DocumentWithChunks,
  SearchResult,
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
  CreateChunkInput,
  SearchOptions,
  ChunkWithRank,
} from './repositories/IDocumentRepository.js';
