/**
 * Module de gestion des documents pour la recherche sémantique (RAG)
 *
 * @example
 * ```ts
 * import { getDocumentService } from './application/services/document';
 *
 * const service = getDocumentService();
 *
 * // Ajouter un document
 * await service.addDocument({ content: 'Guide Docker...' });
 *
 * // Rechercher des documents similaires
 * const results = await service.searchByQuery('comment configurer Docker ?');
 * ```
 */

// Service
export {
  DocumentService,
  getDocumentService,
  resetDocumentService,
} from './DocumentService.js';

// Types - réexportés depuis le domaine
export type {
  Document,
  DocumentWithDistance,
  IDocumentRepository,
  CreateDocumentInput,
  SearchOptions,
} from '../../../domain/document/index.js';

// Errors - réexportés depuis le domaine
export {
  DocumentError,
  DocumentNotFoundError,
  EmbeddingGenerationError,
  InvalidDocumentContentError,
} from '../../../domain/document/index.js';

// Value Objects
export { Embedding } from '../../../domain/document/index.js';

