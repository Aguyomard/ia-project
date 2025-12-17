import type { Conversation, ConversationWithMessages } from '../entities/Conversation.js';
import type { Message, ChatMessage } from '../entities/Message.js';
import type { MessageRole } from '../valueObjects/MessageRole.js';

/**
 * Input pour créer un message
 */
export interface CreateMessageInput {
  conversationId: string;
  role: MessageRole;
  content: string;
}

/**
 * Interface du repository Conversation (Port)
 * Implémenté par l'infrastructure (Prisma, etc.)
 */
export interface IConversationRepository {
  /**
   * Crée une nouvelle conversation
   */
  create(userId?: string, title?: string): Promise<Conversation>;

  /**
   * Récupère une conversation par son ID
   */
  findById(id: string): Promise<Conversation | null>;

  /**
   * Récupère une conversation avec ses messages
   */
  findByIdWithMessages(id: string): Promise<ConversationWithMessages | null>;

  /**
   * Liste les conversations d'un utilisateur
   */
  findByUserId(userId?: string): Promise<Conversation[]>;

  /**
   * Met à jour le titre d'une conversation
   */
  updateTitle(id: string, title: string): Promise<Conversation>;

  /**
   * Supprime une conversation
   */
  delete(id: string): Promise<boolean>;

  /**
   * Ajoute un message à une conversation
   */
  addMessage(input: CreateMessageInput): Promise<Message>;

  /**
   * Récupère les messages d'une conversation
   */
  getMessages(conversationId: string): Promise<Message[]>;

  /**
   * Récupère l'historique formaté pour le LLM
   */
  getChatHistory(conversationId: string): Promise<ChatMessage[]>;
}

