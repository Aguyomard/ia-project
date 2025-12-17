import { getConversationRepository } from '../../../infrastructure/persistence/index.js';
import type {
  Conversation,
  ConversationWithMessages,
  Message,
  ChatMessage,
  CreateMessageInput,
} from '../../../domain/conversation/index.js';
import { ConversationNotFoundError } from '../../../domain/conversation/index.js';

/**
 * Service de haut niveau pour les conversations
 * Orchestre le repository et ajoute des fonctionnalités métier
 *
 * @example
 * ```ts
 * const service = getConversationService();
 * const conversation = await service.createConversation();
 * await service.addMessage({ conversationId: conversation.id, role: 'user', content: 'Hello' });
 * ```
 */
export class ConversationService {
  /**
   * Crée une nouvelle conversation
   */
  public async createConversation(
    userId?: string,
    title?: string
  ): Promise<Conversation> {
    const repository = getConversationRepository();
    return repository.create(userId, title);
  }

  /**
   * Récupère une conversation par son ID
   * @throws {ConversationNotFoundError} Si la conversation n'existe pas
   */
  public async getConversation(id: string): Promise<Conversation> {
    const repository = getConversationRepository();
    const conversation = await repository.findById(id);
    if (!conversation) {
      throw new ConversationNotFoundError(id);
    }
    return conversation;
  }

  /**
   * Récupère une conversation avec ses messages
   */
  public async getConversationWithMessages(
    id: string
  ): Promise<ConversationWithMessages | null> {
    const repository = getConversationRepository();
    return repository.findByIdWithMessages(id);
  }

  /**
   * Liste les conversations d'un utilisateur
   */
  public async listConversations(userId?: string): Promise<Conversation[]> {
    const repository = getConversationRepository();
    return repository.findByUserId(userId);
  }

  /**
   * Supprime une conversation et ses messages
   */
  public async deleteConversation(id: string): Promise<boolean> {
    const repository = getConversationRepository();
    return repository.delete(id);
  }

  /**
   * Ajoute un message à une conversation
   */
  public async addMessage(input: CreateMessageInput): Promise<Message> {
    const repository = getConversationRepository();
    return repository.addMessage(input);
  }

  /**
   * Récupère tous les messages d'une conversation
   */
  public async getMessages(conversationId: string): Promise<Message[]> {
    const repository = getConversationRepository();
    return repository.getMessages(conversationId);
  }

  /**
   * Récupère les messages au format ChatMessage pour le LLM
   */
  public async getChatHistory(conversationId: string): Promise<ChatMessage[]> {
    const repository = getConversationRepository();
    return repository.getChatHistory(conversationId);
  }

  /**
   * Génère un titre pour la conversation basé sur le premier message
   * (Logique métier qui n'est pas dans le repository)
   */
  public async generateTitle(conversationId: string): Promise<void> {
    const repository = getConversationRepository();
    const messages = await repository.getMessages(conversationId);

    const firstUserMessage = messages.find((m) => m.role === 'user');

    if (firstUserMessage) {
      const title =
        firstUserMessage.content.substring(0, 50) +
        (firstUserMessage.content.length > 50 ? '...' : '');

      await repository.updateTitle(conversationId, title);
    }
  }
}

// Singleton
let instance: ConversationService | null = null;

export function getConversationService(): ConversationService {
  if (!instance) {
    instance = new ConversationService();
  }
  return instance;
}

export function resetConversationService(): void {
  instance = null;
}

export default ConversationService;

