/**
 * Module de gestion des documents pour la recherche sémantique (RAG)
 *
 * @example
 * ```ts
 * import { getDocumentService } from './services/document';
 *
 * const service = getDocumentService();
 *
 * // Ajouter un document
 * await service.addDocument({ content: 'Guide Docker...' });
 *
 * // Rechercher des documents similaires
 * const results = await service.searchSimilar('comment configurer Docker ?');
 * ```
 */

// Service
export {
  DocumentService,
  getDocumentService,
  resetDocumentService,
} from './DocumentService.js';

// Types
export type {
  Document,
  CreateDocumentInput,
  SearchResult,
  SearchOptions,
} from './types.js';

// Errors
export {
  DocumentError,
  DocumentNotFoundError,
  EmbeddingError,
  DatabaseError,
} from './errors.js';


