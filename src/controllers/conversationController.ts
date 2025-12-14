import type { Request, Response } from 'express';
import { getConversationService } from '../services/conversation/index.js';
import { getMistralService } from '../services/mistral/index.js';

const SYSTEM_PROMPT =
  'Tu es un assistant IA amical et serviable. Tu réponds en français de manière concise et utile.';

/**
 * POST /api/conversations - Créer une nouvelle conversation
 */
export async function createConversation(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { userId } = req.body;
    const conversationService = getConversationService();
    const conversation = await conversationService.createConversation(userId);

    // Ajouter le message système initial
    await conversationService.addMessage({
      conversationId: conversation.id,
      role: 'system',
      content: SYSTEM_PROMPT,
    });

    console.log('📝 New conversation created:', conversation.id);
    res.json({ conversation });
  } catch (error) {
    console.error('❌ Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
}

/**
 * GET /api/conversations - Lister les conversations
 */
export async function listConversations(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { userId } = req.query;
    const conversationService = getConversationService();
    const conversations = await conversationService.listConversations(
      userId as string | undefined
    );
    res.json({ conversations });
  } catch (error) {
    console.error('❌ Error listing conversations:', error);
    res.status(500).json({ error: 'Failed to list conversations' });
  }
}

/**
 * GET /api/conversations/:id/messages - Récupérer les messages
 */
export async function getMessages(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const conversationService = getConversationService();
    const messages = await conversationService.getMessages(id);

    // Filtrer le message système pour le frontend
    const visibleMessages = messages.filter((m) => m.role !== 'system');
    res.json({ messages: visibleMessages });
  } catch (error) {
    console.error('❌ Error getting messages:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
}

/**
 * POST /api/chat - Envoyer un message et obtenir une réponse
 */
export async function chat(req: Request, res: Response): Promise<void> {
  try {
    const { message, conversationId } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    if (!conversationId) {
      res.status(400).json({ error: 'conversationId is required' });
      return;
    }

    console.log('💬 Chat message:', message, 'in conversation:', conversationId);

    const conversationService = getConversationService();
    const mistral = getMistralService();

    // Ajouter le message utilisateur
    await conversationService.addMessage({
      conversationId,
      role: 'user',
      content: message,
    });

    // Récupérer l'historique et envoyer à Mistral
    const chatHistory = await conversationService.getChatHistory(conversationId);
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
    res.json({ response: aiResponse, conversationId });
  } catch (error) {
    console.error('❌ Chat error:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération de la réponse',
      response: 'Désolé, une erreur est survenue. Réessaie plus tard.',
    });
  }
}

