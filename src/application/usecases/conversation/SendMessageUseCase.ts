import type {
  ISendMessageUseCase,
  SendMessageInput,
  SendMessageOutput,
} from '../../ports/in/conversation.js';
import type { SendMessageDependencies } from './types.js';
import { getConversationService } from '../../services/conversation/index.js';
import { getMistralClient } from '../../../infrastructure/external/mistral/index.js';
import { getRAGService } from '../../services/rag/index.js';

export type { SendMessageInput, SendMessageOutput };
export type { SendMessageDependencies } from './types.js';

export class SendMessageUseCase implements ISendMessageUseCase {
  constructor(private readonly deps: SendMessageDependencies) {}

  async execute(input: SendMessageInput): Promise<SendMessageOutput> {
    const { conversationId, message } = input;
    const { conversationService, mistralClient, ragService } = this.deps;

    await conversationService.addMessage({
      conversationId,
      role: 'user',
      content: message,
    });

    const chatHistory =
      await conversationService.getChatHistory(conversationId);

    const ragContext = await ragService.buildEnrichedPrompt(message);
    if (chatHistory.length > 0 && chatHistory[0].role === 'system') {
      chatHistory[0].content = ragContext.enrichedPrompt;
    }

    const aiResponse = await mistralClient.complete(chatHistory);

    if (!aiResponse) {
      throw new Error('Empty response from Mistral');
    }

    await conversationService.addMessage({
      conversationId,
      role: 'assistant',
      content: aiResponse,
    });

    const messages = await conversationService.getMessages(conversationId);
    if (messages.filter((m) => m.role === 'user').length === 1) {
      await conversationService.generateTitle(conversationId);
    }

    return { response: aiResponse, conversationId };
  }
}

export function createSendMessageUseCase(
  deps: Partial<SendMessageDependencies> = {}
): SendMessageUseCase {
  return new SendMessageUseCase({
    conversationService: deps.conversationService ?? getConversationService(),
    mistralClient: deps.mistralClient ?? getMistralClient(),
    ragService: deps.ragService ?? getRAGService(),
  });
}

export const sendMessageUseCase = createSendMessageUseCase();
