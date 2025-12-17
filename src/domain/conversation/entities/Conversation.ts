import type { Message } from './Message.js';

/**
 * Entité Conversation du domaine
 */
export interface Conversation {
  id: string;
  userId: string | null;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Conversation avec ses messages
 */
export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}
