/**
 * Erreurs personnalisées pour le service de conversations
 */

export class ConversationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'ConversationError';
  }
}

export class ConversationNotFoundError extends ConversationError {
  constructor(conversationId: string) {
    super(`Conversation not found: ${conversationId}`, 'NOT_FOUND');
  }
}

export class InvalidInputError extends ConversationError {
  constructor(message: string) {
    super(message, 'INVALID_INPUT');
  }
}

export class DatabaseError extends ConversationError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'DATABASE_ERROR', originalError);
  }
}

