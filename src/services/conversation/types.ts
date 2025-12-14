/**
 * Types pour le service de conversations
 */

/** Format de message pour Mistral */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Input pour créer un message */
export interface CreateMessageInput {
  conversationId: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Input pour créer une conversation */
export interface CreateConversationInput {
  userId?: string;
  title?: string;
}

