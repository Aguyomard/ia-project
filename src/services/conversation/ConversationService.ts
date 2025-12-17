import type { PrismaClient } from '@prisma/client';
import prismaClient from '../../config/prisma.js';
import { validateUUID, validateContent } from './validators.js';
import type {
  Conversation,
  ConversationWithMessages,
  Message,
  ChatMessage,
  IConversationRepository,
  CreateMessageInput,
} from '../../domain/conversation/index.js';
import {
  ConversationNotFoundError,
  InvalidConversationInputError,
} from '../../domain/conversation/index.js';

/**
 * Service pour gérer les conversations et messages avec Prisma
 * Implémente IConversationRepository du domaine
 *
 * @example
 * ```ts
 * const service = getConversationService();
 * const conversation = await service.create();
 * await service.addMessage({ conversationId: conversation.id, role: 'user', content: 'Hello' });
 * ```
 */
export class ConversationService implements IConversationRepository {
  private readonly prisma: PrismaClient;

  public constructor(prisma: PrismaClient = prismaClient) {
    this.prisma = prisma;
  }

  /**
   * Crée une nouvelle conversation
   */
  public async create(userId?: string, title?: string): Promise<Conversation> {
    try {
      const result = await this.prisma.conversation.create({
        data: {
          userId: userId || null,
          title: title || null,
        },
      });
      return result as Conversation;
    } catch (error) {
      throw new InvalidConversationInputError(
        `Failed to create conversation: ${error}`
      );
    }
  }

  /**
   * Alias pour compatibilité avec l'ancien code
   */
  public async createConversation(
    userId?: string,
    title?: string
  ): Promise<Conversation> {
    return this.create(userId, title);
  }

  /**
   * Récupère une conversation par son ID
   */
  public async findById(id: string): Promise<Conversation | null> {
    validateUUID(id, 'conversationId');

    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
    });

    return conversation as Conversation | null;
  }

  /**
   * Récupère une conversation par son ID (throw si non trouvée)
   * @throws {ConversationNotFoundError} Si la conversation n'existe pas
   */
  public async getConversation(id: string): Promise<Conversation> {
    const conversation = await this.findById(id);
    if (!conversation) {
      throw new ConversationNotFoundError(id);
    }
    return conversation;
  }

  /**
   * Récupère une conversation avec ses messages
   */
  public async findByIdWithMessages(
    id: string
  ): Promise<ConversationWithMessages | null> {
    validateUUID(id, 'conversationId');

    const result = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return result as ConversationWithMessages | null;
  }

  /**
   * Alias pour compatibilité
   */
  public async getConversationWithMessages(
    id: string
  ): Promise<ConversationWithMessages | null> {
    return this.findByIdWithMessages(id);
  }

  /**
   * Liste les conversations d'un utilisateur
   */
  public async findByUserId(userId?: string): Promise<Conversation[]> {
    const results = await this.prisma.conversation.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { updatedAt: 'desc' },
    });
    return results as Conversation[];
  }

  /**
   * Alias pour compatibilité
   */
  public async listConversations(userId?: string): Promise<Conversation[]> {
    return this.findByUserId(userId);
  }

  /**
   * Met à jour le titre d'une conversation
   */
  public async updateTitle(id: string, title: string): Promise<Conversation> {
    validateUUID(id, 'conversationId');

    const result = await this.prisma.conversation.update({
      where: { id },
      data: { title },
    });
    return result as Conversation;
  }

  /**
   * Supprime une conversation et ses messages
   */
  public async delete(id: string): Promise<boolean> {
    validateUUID(id, 'conversationId');

    try {
      await this.prisma.conversation.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Alias pour compatibilité
   */
  public async deleteConversation(id: string): Promise<boolean> {
    return this.delete(id);
  }

  /**
   * Ajoute un message à une conversation (avec transaction)
   */
  public async addMessage(input: CreateMessageInput): Promise<Message> {
    validateUUID(input.conversationId, 'conversationId');
    validateContent(input.content);

    try {
      const [message] = await this.prisma.$transaction([
        this.prisma.message.create({
          data: {
            conversationId: input.conversationId,
            role: input.role,
            content: input.content,
          },
        }),
        this.prisma.conversation.update({
          where: { id: input.conversationId },
          data: { updatedAt: new Date() },
        }),
      ]);

      return message as Message;
    } catch (error) {
      throw new InvalidConversationInputError(
        `Failed to add message: ${error}`
      );
    }
  }

  /**
   * Récupère tous les messages d'une conversation (triés par date)
   */
  public async getMessages(conversationId: string): Promise<Message[]> {
    validateUUID(conversationId, 'conversationId');

    const results = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
    return results as Message[];
  }

  /**
   * Récupère les messages au format ChatMessage pour Mistral
   */
  public async getChatHistory(conversationId: string): Promise<ChatMessage[]> {
    const messages = await this.getMessages(conversationId);
    return messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }

  /**
   * Génère un titre pour la conversation basé sur le premier message
   */
  public async generateTitle(conversationId: string): Promise<void> {
    validateUUID(conversationId, 'conversationId');

    const firstUserMessage = await this.prisma.message.findFirst({
      where: {
        conversationId,
        role: 'user',
      },
      orderBy: { createdAt: 'asc' },
    });

    if (firstUserMessage) {
      const title =
        firstUserMessage.content.substring(0, 50) +
        (firstUserMessage.content.length > 50 ? '...' : '');

      await this.updateTitle(conversationId, title);
    }
  }
}

// ============================================
// Singleton
// ============================================

let instance: ConversationService | null = null;

export function getConversationService(
  prisma?: PrismaClient
): ConversationService {
  if (!instance) {
    instance = new ConversationService(prisma);
  }
  return instance;
}

export function resetConversationService(): void {
  instance = null;
}

export default ConversationService;
