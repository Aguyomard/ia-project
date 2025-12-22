import type { Conversation } from '../../../domain/conversation/index.js';

export interface CreateConversationInput {
  userId?: string;
}

export interface CreateConversationOutput {
  conversation: Conversation;
}

export interface ICreateConversationUseCase {
  execute(input: CreateConversationInput): Promise<CreateConversationOutput>;
}

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

export interface StreamMessageInput {
  conversationId: string;
  message: string;
  /** Utiliser le RAG pour enrichir le contexte (défaut: true) */
  useRAG?: boolean;
  /** Utiliser le reranking pour améliorer la pertinence (défaut: true) */
  useReranking?: boolean;
  /** Utiliser la reformulation de requête (défaut: true) */
  useQueryRewrite?: boolean;
}

export interface StreamMessageSource {
  title: string;
  similarity: number;
}

export interface StreamMessageChunk {
  chunk?: string;
  done?: boolean;
  fullResponse?: string;
  sources?: StreamMessageSource[];
}

export interface IStreamMessageUseCase {
  execute(input: StreamMessageInput): AsyncGenerator<StreamMessageChunk>;
}
