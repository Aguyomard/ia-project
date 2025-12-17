import type { Request, Response } from 'express';
import { getConversationService } from '../../../application/services/conversation/index.js';
import {
  createConversationUseCase,
  sendMessageUseCase,
  streamMessageUseCase,
} from '../../../application/usecases/index.js';

/**
 * POST /api/conversations - Créer une nouvelle conversation
 */
export async function createConversation(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { userId } = req.body;
    const result = await createConversationUseCase.execute({ userId });
    res.json(result);
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

    const result = await sendMessageUseCase.execute({
      message,
      conversationId,
    });
    res.json(result);
  } catch (error) {
    console.error('❌ Chat error:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération de la réponse',
      response: 'Désolé, une erreur est survenue. Réessaie plus tard.',
    });
  }
}

/**
 * POST /api/chat/stream - Envoyer un message et streamer la réponse (SSE)
 */
export async function chatStream(req: Request, res: Response): Promise<void> {
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

    // Configurer SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    // Streamer les chunks depuis le use case
    for await (const event of streamMessageUseCase.execute({
      message,
      conversationId,
    })) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    res.end();
  } catch (error) {
    console.error('❌ Stream error:', error);

    // Si headers pas encore envoyés, envoyer JSON
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Erreur lors du streaming',
      });
    } else {
      // Sinon envoyer un événement d'erreur
      res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
      res.end();
    }
  }
}

