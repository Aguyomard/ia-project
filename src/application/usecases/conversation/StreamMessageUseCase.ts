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

// Re-export types from ports
export type { StreamMessageInput, StreamMessageChunk };

export interface StreamMessageDependencies {
  conversationService: IConversationService;
  mistralClient: IMistralClient;
  ragService: IRAGService;
}

/**
 * Use Case : Envoyer un message et streamer la réponse IA
 */
export class StreamMessageUseCase implements IStreamMessageUseCase {
  constructor(private readonly deps: StreamMessageDependencies) {}

  async *execute(
    input: StreamMessageInput
  ): AsyncGenerator<StreamMessageChunk> {
    const { conversationId, message } = input;
    const { conversationService, mistralClient, ragService } = this.deps;

    console.log('🌊 Stream chat:', message, 'in conversation:', conversationId);

    // Ajouter le message utilisateur
    await conversationService.addMessage({
      conversationId,
      role: 'user',
      content: message,
    });

    // Récupérer l'historique
    const chatHistory =
      await conversationService.getChatHistory(conversationId);

    // RAG : Enrichir le system prompt avec les documents pertinents
    const ragContext = await ragService.buildEnrichedPrompt(message);
    if (chatHistory.length > 0 && chatHistory[0].role === 'system') {
      chatHistory[0].content = ragContext.enrichedPrompt;
    }

    // Collecter la réponse complète pour la sauvegarder
    let fullResponse = '';

    // Streamer les chunks
    for await (const chunk of mistralClient.streamComplete(chatHistory)) {
      fullResponse += chunk;
      yield { chunk };
    }

    // Sauvegarder la réponse complète
    await conversationService.addMessage({
      conversationId,
      role: 'assistant',
      content: fullResponse,
    });

    // Générer un titre si premier message
    const messages = await conversationService.getMessages(conversationId);
    if (messages.filter((m) => m.role === 'user').length === 1) {
      await conversationService.generateTitle(conversationId);
    }

    console.log('✅ Stream completed');

    // Événement de fin
    yield { done: true, fullResponse };
  }
}

// Factory avec injection par défaut
export function createStreamMessageUseCase(
  deps: Partial<StreamMessageDependencies> = {}
): StreamMessageUseCase {
  return new StreamMessageUseCase({
    conversationService: deps.conversationService ?? getConversationService(),
    mistralClient: deps.mistralClient ?? getMistralClient(),
    ragService: deps.ragService ?? getRAGService(),
  });
}

// Singleton avec dépendances par défaut
export const streamMessageUseCase = createStreamMessageUseCase();
