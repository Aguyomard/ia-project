import type {
  Conversation,
  ConversationWithMessages,
  Message,
  ChatMessage,
  CreateMessageInput,
} from '../../../domain/conversation/index.js';

export interface IConversationService {
  createConversation(userId?: string, title?: string): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation>;
  getConversationWithMessages(id: string): Promise<ConversationWithMessages | null>;
  listConversations(userId?: string): Promise<Conversation[]>;
  deleteConversation(id: string): Promise<boolean>;
  addMessage(input: CreateMessageInput): Promise<Message>;
  getMessages(conversationId: string): Promise<Message[]>;
  getChatHistory(conversationId: string): Promise<ChatMessage[]>;
  generateTitle(conversationId: string): Promise<void>;
}
