/**
 * Ports primaires (driving) pour les use cases de conversation
 */

import type { Conversation } from '../../../domain/conversation/index.js';

// ============================================
// CreateConversation
// ============================================

export interface CreateConversationInput {
  userId?: string;
}

export interface CreateConversationOutput {
  conversation: Conversation;
}

export interface ICreateConversationUseCase {
  execute(input: CreateConversationInput): Promise<CreateConversationOutput>;
}

// ============================================
// SendMessage
// ============================================

export interface SendMessageInput {
  conversationId: string;
  message: string;
}

export interface SendMessageOutput {
  response: string;
  conversationId: string;
}

export interface ISendMessageUseCase {
  execute(input: SendMessageInput): Promise<SendMessageOutput>;
}

// ============================================
// StreamMessage
// ============================================

export interface StreamMessageInput {
  conversationId: string;
  message: string;
}

export interface StreamMessageChunk {
  chunk?: string;
  done?: boolean;
  fullResponse?: string;
}

export interface IStreamMessageUseCase {
  execute(input: StreamMessageInput): AsyncGenerator<StreamMessageChunk>;
}
