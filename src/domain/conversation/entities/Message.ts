import type { MessageRole } from '../valueObjects/MessageRole.js';

/**
 * Entité Message du domaine
 */
export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
}

/**
 * Message formaté pour l'API LLM (Mistral)
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

