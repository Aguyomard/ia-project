import { getConversationService } from '../../../services/conversation/index.js';
import { getMistralService } from '../../../services/mistral/index.js';
import { getRAGService } from '../../../services/rag/index.js';

export interface SendMessageInput {
  conversationId: string;
  message: string;
}

export interface SendMessageOutput {
  response: string;
  conversationId: string;
}

/**
 * Use Case : Envoyer un message et obtenir une réponse IA
 */
export class SendMessageUseCase {
  async execute(input: SendMessageInput): Promise<SendMessageOutput> {
    const { conversationId, message } = input;

    const conversationService = getConversationService();
    const mistral = getMistralService();
    const ragService = getRAGService();

    console.log('💬 Chat message:', message, 'in conversation:', conversationId);

    // Ajouter le message utilisateur
    await conversationService.addMessage({
      conversationId,
      role: 'user',
      content: message,
    });

    // Récupérer l'historique
    const chatHistory = await conversationService.getChatHistory(conversationId);

    // RAG : Enrichir le system prompt avec les documents pertinents
    const ragContext = await ragService.buildEnrichedPrompt(message);
    if (chatHistory.length > 0 && chatHistory[0].role === 'system') {
      chatHistory[0].content = ragContext.enrichedPrompt;
    }

    // Envoyer à Mistral
    const aiResponse = await mistral.complete(chatHistory);

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

export const sendMessageUseCase = new SendMessageUseCase();

