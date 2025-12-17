import type { Conversation } from '../../../domain/conversation/index.js';
import { getConversationService } from '../../../services/conversation/index.js';
import { BASE_SYSTEM_PROMPT } from '../../../services/rag/index.js';

export interface CreateConversationInput {
  userId?: string;
}

export interface CreateConversationOutput {
  conversation: Conversation;
}

/**
 * Use Case : Créer une nouvelle conversation
 */
export class CreateConversationUseCase {
  async execute(
    input: CreateConversationInput
  ): Promise<CreateConversationOutput> {
    const conversationService = getConversationService();

    const conversation = await conversationService.createConversation(
      input.userId
    );

    // Ajouter le message système initial
    await conversationService.addMessage({
      conversationId: conversation.id,
      role: 'system',
      content: BASE_SYSTEM_PROMPT,
    });

    console.log('📝 New conversation created:', conversation.id);

    return { conversation };
  }
}

export const createConversationUseCase = new CreateConversationUseCase();

