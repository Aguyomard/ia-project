import type { PrismaClient } from '@prisma/client';
import prismaClient from '../config/prisma.js';
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
 * Valide un UUID
 */
function validateUUID(value: string, fieldName: string): void {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new InvalidConversationInputError(`Invalid ${fieldName}: ${value}`);
  }
}

/**
 * Valide le contenu d'un message
 */
function validateContent(content: string): void {
  if (!content || content.trim().length === 0) {
    throw new InvalidConversationInputError('Content cannot be empty');
  }
}

/**
 * Repository Prisma pour les conversations
 * Implémente IConversationRepository du domaine
 */
export class ConversationRepository implements IConversationRepository {
  private readonly prisma: PrismaClient;

  public constructor(prisma: PrismaClient = prismaClient) {
    this.prisma = prisma;
  }

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

  public async findById(id: string): Promise<Conversation | null> {
    validateUUID(id, 'conversationId');

    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
    });

    return conversation as Conversation | null;
  }

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

  public async findByUserId(userId?: string): Promise<Conversation[]> {
    const results = await this.prisma.conversation.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { updatedAt: 'desc' },
    });
    return results as Conversation[];
  }

  public async updateTitle(id: string, title: string): Promise<Conversation> {
    validateUUID(id, 'conversationId');

    const result = await this.prisma.conversation.update({
      where: { id },
      data: { title },
    });
    return result as Conversation;
  }

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

  public async getMessages(conversationId: string): Promise<Message[]> {
    validateUUID(conversationId, 'conversationId');

    const results = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
    return results as Message[];
  }

  public async getChatHistory(conversationId: string): Promise<ChatMessage[]> {
    const messages = await this.getMessages(conversationId);
    return messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }
}

// Singleton
let instance: ConversationRepository | null = null;

export function getConversationRepository(
  prisma?: PrismaClient
): ConversationRepository {
  if (!instance) {
    instance = new ConversationRepository(prisma);
  }
  return instance;
}

export function resetConversationRepository(): void {
  instance = null;
}
