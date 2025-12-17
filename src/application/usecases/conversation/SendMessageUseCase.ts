import type {
  ISendMessageUseCase,
  SendMessageInput,
  SendMessageOutput,
} from '../../ports/in/conversation.js';
import type { IConversationService } from '../../ports/out/IConversationService.js';
import type { IMistralClient } from '../../ports/out/IMistralClient.js';
import type { IRAGService } from '../../ports/out/IRAGService.js';
import { getConversationService } from '../../services/conversation/index.js';
import { getMistralClient } from '../../../infrastructure/external/mistral/index.js';
import { getRAGService } from '../../services/rag/index.js';

// Re-export types from ports
export type { SendMessageInput, SendMessageOutput };

export interface SendMessageDependencies {
  conversationService: IConversationService;
  mistralClient: IMistralClient;
  ragService: IRAGService;
}

/**
 * Use Case : Envoyer un message et obtenir une réponse IA
 */
export class SendMessageUseCase implements ISendMessageUseCase {
  constructor(private readonly deps: SendMessageDependencies) {}

  async execute(input: SendMessageInput): Promise<SendMessageOutput> {
    const { conversationId, message } = input;
    const { conversationService, mistralClient, ragService } = this.deps;

    console.log(
      '💬 Chat message:',
      message,
      'in conversation:',
      conversationId
    );

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

    // Envoyer à Mistral
    const aiResponse = await mistralClient.complete(chatHistory);

    if (!aiResponse) {
      throw new Error('Empty response from Mistral');
    }

    // Sauvegarder la réponse
    await conversationService.addMessage({
      conversationId,
      role: 'assistant',
      content: aiResponse,
    });

    // Générer un titre si premier message
    const messages = await conversationService.getMessages(conversationId);
    if (messages.filter((m) => m.role === 'user').length === 1) {
      await conversationService.generateTitle(conversationId);
    }

    console.log('✅ Chat response sent');

    return { response: aiResponse, conversationId };
  }
}

// Factory avec injection par défaut
export function createSendMessageUseCase(
  deps: Partial<SendMessageDependencies> = {}
): SendMessageUseCase {
  return new SendMessageUseCase({
    conversationService: deps.conversationService ?? getConversationService(),
    mistralClient: deps.mistralClient ?? getMistralClient(),
    ragService: deps.ragService ?? getRAGService(),
  });
}

// Singleton avec dépendances par défaut
export const sendMessageUseCase = createSendMessageUseCase();
