import { getConversationService } from '../../../services/conversation/index.js';
import { getMistralService } from '../../../services/mistral/index.js';
import { getRAGService } from '../../../services/rag/index.js';

export interface StreamMessageInput {
  conversationId: string;
  message: string;
}

export interface StreamMessageChunk {
  chunk?: string;
  done?: boolean;
  fullResponse?: string;
}

/**
 * Use Case : Envoyer un message et streamer la réponse IA
 */
export class StreamMessageUseCase {
  async *execute(input: StreamMessageInput): AsyncGenerator<StreamMessageChunk> {
    const { conversationId, message } = input;

    const conversationService = getConversationService();
    const mistral = getMistralService();
    const ragService = getRAGService();

    console.log('🌊 Stream chat:', message, 'in conversation:', conversationId);

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

    // Collecter la réponse complète pour la sauvegarder
    let fullResponse = '';

    // Streamer les chunks
    for await (const chunk of mistral.streamComplete(chatHistory)) {
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

export const streamMessageUseCase = new StreamMessageUseCase();

