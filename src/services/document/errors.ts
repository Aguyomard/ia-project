/**
 * Erreurs personnalisées pour le service de documents
 */

export class DocumentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'DocumentError';
  }
}

export class DocumentNotFoundError extends DocumentError {
  constructor(documentId: number) {
    super(`Document not found: ${documentId}`, 'NOT_FOUND');
  }
}

export class EmbeddingError extends DocumentError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'EMBEDDING_ERROR', originalError);
  }
}

export class DatabaseError extends DocumentError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'DATABASE_ERROR', originalError);
  }
}


