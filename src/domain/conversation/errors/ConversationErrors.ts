import { DomainError } from '../../shared/errors/DomainError.js';

/**
 * Erreur de base pour le domaine Conversation
 */
export class ConversationError extends DomainError {
  constructor(message: string, code: string, originalError?: unknown) {
    super(message, code, originalError);
  }
}

/**
 * Conversation non trouvée
 */
export class ConversationNotFoundError extends ConversationError {
  constructor(conversationId: string) {
    super(
      `Conversation not found: ${conversationId}`,
      'CONVERSATION_NOT_FOUND'
    );
  }
}

/**
 * Entrée invalide
 */
export class InvalidConversationInputError extends ConversationError {
  constructor(message: string) {
    super(message, 'INVALID_INPUT');
  }
}
