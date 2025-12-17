import { DomainError } from '../../shared/errors/DomainError.js';

/**
 * Erreur de base pour le domaine Document
 */
export class DocumentError extends DomainError {
  constructor(message: string, code: string, originalError?: unknown) {
    super(message, code, originalError);
  }
}

/**
 * Document non trouvé
 */
export class DocumentNotFoundError extends DocumentError {
  constructor(documentId: number) {
    super(`Document not found: ${documentId}`, 'DOCUMENT_NOT_FOUND');
  }
}

/**
 * Erreur lors de la génération d'embedding
 */
export class EmbeddingGenerationError extends DocumentError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'EMBEDDING_ERROR', originalError);
  }
}

/**
 * Contenu de document invalide
 */
export class InvalidDocumentContentError extends DocumentError {
  constructor(message: string) {
    super(message, 'INVALID_CONTENT');
  }
}

