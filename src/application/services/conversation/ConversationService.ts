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

export class ConversationService implements IConversationService {
  async createConversation(
    userId?: string,
    title?: string
  ): Promise<Conversation> {
    const repository = getConversationRepository();
    return repository.create(userId, title);
  }

  async getConversation(id: string): Promise<Conversation> {
    const repository = getConversationRepository();
    const conversation = await repository.findById(id);
    if (!conversation) {
      throw new ConversationNotFoundError(id);
    }
    return conversation;
  }

  async getConversationWithMessages(
    id: string
  ): Promise<ConversationWithMessages | null> {
    const repository = getConversationRepository();
    return repository.findByIdWithMessages(id);
  }

  async listConversations(userId?: string): Promise<Conversation[]> {
    const repository = getConversationRepository();
    return repository.findByUserId(userId);
  }

  async deleteConversation(id: string): Promise<boolean> {
    const repository = getConversationRepository();
    return repository.delete(id);
  }

  async addMessage(input: CreateMessageInput): Promise<Message> {
    const repository = getConversationRepository();
    return repository.addMessage(input);
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    const repository = getConversationRepository();
    return repository.getMessages(conversationId);
  }

  async getChatHistory(conversationId: string): Promise<ChatMessage[]> {
    const repository = getConversationRepository();
    return repository.getChatHistory(conversationId);
  }

  async generateTitle(conversationId: string): Promise<void> {
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
