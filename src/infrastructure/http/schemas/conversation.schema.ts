import { z } from 'zod';

export const CreateConversationSchema = z.object({
  userId: z.string().optional(),
});

export const ChatSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  conversationId: z.string().uuid('Invalid conversation ID'),
});

export const ChatStreamSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  conversationId: z.string().uuid('Invalid conversation ID'),
  useRAG: z.boolean().optional().default(true),
  useReranking: z.boolean().optional().default(true),
  useQueryRewrite: z.boolean().optional().default(true),
});

export const ConversationIdParamSchema = z.object({
  id: z.string().uuid('Invalid conversation ID'),
});

export const ListConversationsQuerySchema = z.object({
  userId: z.string().optional(),
});

export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;
export type ChatInput = z.infer<typeof ChatSchema>;
export type ChatStreamInput = z.infer<typeof ChatStreamSchema>;
