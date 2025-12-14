import type { PrismaClient, Conversation, Message } from '@prisma/client';
import prismaClient from '../../config/prisma.js';
import { ConversationNotFoundError, DatabaseError } from './errors.js';
import { validateUUID, validateContent } from './validators.js';
import type { ChatMessage, CreateMessageInput } from './types.js';

/**
 * Service pour gérer les conversations et messages avec Prisma
 *
 * @example
 * ```ts
 * const service = getConversationService();
 * const conversation = await service.createConversation();
 * await service.addMessage({ conversationId: conversation.id, role: 'user', content: 'Hello' });
 * ```
 */
export class ConversationService {
  private readonly prisma: PrismaClient;

  public constructor(prisma: PrismaClient = prismaClient) {
    this.prisma = prisma;
  }

  /**
   * Crée une nouvelle conversation
   */
  public async createConversation(
    userId?: string,
    title?: string
  ): Promise<Conversation> {
    try {
      return await this.prisma.conversation.create({
        data: {
          userId: userId || null,
          title: title || null,
        },
      });
    } catch (error) {
      throw new DatabaseError('Failed to create conversation', error);
    }
  }

  /**
   * Récupère une conversation par son ID
   * @throws {ConversationNotFoundError} Si la conversation n'existe pas
   */
  public async getConversation(id: string): Promise<Conversation> {
    validateUUID(id, 'conversationId');

    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      throw new ConversationNotFoundError(id);
    }

    return conversation;
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

      return message;
    } catch (error) {
      throw new DatabaseError('Failed to add message', error);
    }
  }

  /**
   * Récupère tous les messages d'une conversation (triés par date)
   */
  public async getMessages(conversationId: string): Promise<Message[]> {
    validateUUID(conversationId, 'conversationId');

    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
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
   * Liste les conversations d'un utilisateur
   */
  public async listConversations(userId?: string): Promise<Conversation[]> {
    return this.prisma.conversation.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Supprime une conversation et ses messages
   */
  public async deleteConversation(id: string): Promise<boolean> {
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

      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { title },
      });
    }
  }

  /**
   * Récupère une conversation avec tous ses messages
   */
  public async getConversationWithMessages(id: string) {
    validateUUID(id, 'conversationId');

    return this.prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
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
