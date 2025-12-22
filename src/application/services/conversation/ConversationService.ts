import { getConversationRepository } from '../../../infrastructure/persistence/index.js';
import type {
  Conversation,
  ConversationWithMessages,
  Message,
  ChatMessage,
  CreateMessageInput,
} from '../../../domain/conversation/index.js';
import { ConversationNotFoundError } from '../../../domain/conversation/index.js';
import type { IConversationService } from '../../ports/out/IConversationService.js';
import type { ConversationServiceDependencies } from './types.js';

export class ConversationService implements IConversationService {
  private readonly repository;

  constructor(deps: ConversationServiceDependencies) {
    this.repository = deps.repository;
  }

  async createConversation(userId?: string, title?: string): Promise<Conversation> {
    return this.repository.create(userId, title);
  }

  async getConversation(id: string): Promise<Conversation> {
    const conversation = await this.repository.findById(id);
    if (!conversation) {
      throw new ConversationNotFoundError(id);
    }
    return conversation;
  }

  async getConversationWithMessages(id: string): Promise<ConversationWithMessages | null> {
    return this.repository.findByIdWithMessages(id);
  }

  async listConversations(userId?: string): Promise<Conversation[]> {
    return this.repository.findByUserId(userId);
  }

  async deleteConversation(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }

  async addMessage(input: CreateMessageInput): Promise<Message> {
    return this.repository.addMessage(input);
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return this.repository.getMessages(conversationId);
  }

  async getChatHistory(conversationId: string): Promise<ChatMessage[]> {
    return this.repository.getChatHistory(conversationId);
  }

  async generateTitle(conversationId: string): Promise<void> {
    const messages = await this.repository.getMessages(conversationId);
    const firstUserMessage = messages.find((m) => m.role === 'user');

    if (firstUserMessage) {
      const title =
        firstUserMessage.content.substring(0, 50) +
        (firstUserMessage.content.length > 50 ? '...' : '');
      await this.repository.updateTitle(conversationId, title);
    }
  }
}

let instance: ConversationService | null = null;

export function getConversationService(): ConversationService {
  if (!instance) {
    instance = new ConversationService({
      repository: getConversationRepository(),
    });
  }
  return instance;
}

export function resetConversationService(): void {
  instance = null;
}
