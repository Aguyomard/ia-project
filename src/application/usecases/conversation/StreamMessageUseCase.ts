import type {
  IStreamMessageUseCase,
  StreamMessageInput,
  StreamMessageChunk,
} from '../../ports/in/conversation.js';
import type { IConversationService } from '../../ports/out/IConversationService.js';
import type { IMistralClient } from '../../ports/out/IMistralClient.js';
import type { IRAGService } from '../../ports/out/IRAGService.js';
import { getConversationService } from '../../services/conversation/index.js';
import { getMistralClient } from '../../../infrastructure/external/mistral/index.js';
import { getRAGService } from '../../services/rag/index.js';

export type { StreamMessageInput, StreamMessageChunk };

export interface StreamMessageDependencies {
  conversationService: IConversationService;
  mistralClient: IMistralClient;
  ragService: IRAGService;
}

export class StreamMessageUseCase implements IStreamMessageUseCase {
  constructor(private readonly deps: StreamMessageDependencies) {}

  async *execute(
    input: StreamMessageInput
  ): AsyncGenerator<StreamMessageChunk> {
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

    let fullResponse = '';

    for await (const chunk of mistralClient.streamComplete(chatHistory)) {
      fullResponse += chunk;
      yield { chunk };
    }

    await conversationService.addMessage({
      conversationId,
      role: 'assistant',
      content: fullResponse,
    });

    const messages = await conversationService.getMessages(conversationId);
    if (messages.filter((m) => m.role === 'user').length === 1) {
      await conversationService.generateTitle(conversationId);
    }

    yield { done: true, fullResponse };
  }
}

export function createStreamMessageUseCase(
  deps: Partial<StreamMessageDependencies> = {}
): StreamMessageUseCase {
  return new StreamMessageUseCase({
    conversationService: deps.conversationService ?? getConversationService(),
    mistralClient: deps.mistralClient ?? getMistralClient(),
    ragService: deps.ragService ?? getRAGService(),
  });
}

export const streamMessageUseCase = createStreamMessageUseCase();
