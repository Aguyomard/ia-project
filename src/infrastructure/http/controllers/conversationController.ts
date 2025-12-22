import type { Request, Response } from 'express';
import { getConversationService } from '../../../application/services/conversation/index.js';
import {
  createConversationUseCase,
  sendMessageUseCase,
  streamMessageUseCase,
} from '../../../application/usecases/index.js';

export async function createConversation(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { userId } = req.body;
    const result = await createConversationUseCase.execute({ userId });
    res.json(result);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
}

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
    console.error('Error listing conversations:', error);
    res.status(500).json({ error: 'Failed to list conversations' });
  }
}

export async function getMessages(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const conversationService = getConversationService();
    const messages = await conversationService.getMessages(id);
    const visibleMessages = messages.filter((m) => m.role !== 'system');
    res.json({ messages: visibleMessages });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
}

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
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération de la réponse',
      response: 'Désolé, une erreur est survenue. Réessaie plus tard.',
    });
  }
}

export async function chatStream(req: Request, res: Response): Promise<void> {
  try {
    const {
      message,
      conversationId,
      useRAG = true,
      useReranking = true,
      useQueryRewrite = true,
    } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    if (!conversationId) {
      res.status(400).json({ error: 'conversationId is required' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    for await (const event of streamMessageUseCase.execute({
      message,
      conversationId,
      useRAG,
      useReranking,
      useQueryRewrite,
    })) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    res.end();
  } catch (error) {
    console.error('Stream error:', error);

    if (!res.headersSent) {
      res.status(500).json({ error: 'Erreur lors du streaming' });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
      res.end();
    }
  }
}
