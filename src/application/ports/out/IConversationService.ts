/**
 * Port secondaire pour le service de conversation
 */

import type {
  Conversation,
  ConversationWithMessages,
  Message,
  ChatMessage,
  CreateMessageInput,
} from '../../../domain/conversation/index.js';

export interface IConversationService {
  /**
   * Crée une nouvelle conversation
   */
  createConversation(userId?: string, title?: string): Promise<Conversation>;

  /**
   * Récupère une conversation par son ID
   */
  getConversation(id: string): Promise<Conversation>;

  /**
   * Récupère une conversation avec ses messages
   */
  getConversationWithMessages(id: string): Promise<ConversationWithMessages | null>;

  /**
   * Liste les conversations d'un utilisateur
   */
  listConversations(userId?: string): Promise<Conversation[]>;

  /**
   * Supprime une conversation
   */
  deleteConversation(id: string): Promise<boolean>;

  /**
   * Ajoute un message à une conversation
   */
  addMessage(input: CreateMessageInput): Promise<Message>;

  /**
   * Récupère les messages d'une conversation
   */
  getMessages(conversationId: string): Promise<Message[]>;

  /**
   * Récupère l'historique au format ChatMessage pour le LLM
   */
  getChatHistory(conversationId: string): Promise<ChatMessage[]>;

  /**
   * Génère un titre pour la conversation
   */
  generateTitle(conversationId: string): Promise<void>;
}

