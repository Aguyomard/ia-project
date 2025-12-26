import type { Request, Response } from 'express';
import { getConversationService } from '../../../application/services/conversation/index.js';
import {
  createConversationUseCase,
  sendMessageUseCase,
  streamMessageUseCase,
} from '../../../application/usecases/index.js';
import {
  CreateConversationSchema,
  ChatSchema,
  ChatStreamSchema,
  ConversationIdParamSchema,
  ListConversationsQuerySchema,
  validateBody,
  validateQuery,
  validateParams,
} from '../schemas/index.js';

export async function createConversation(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const validation = validateBody(CreateConversationSchema, req.body, res);
    if (!validation.success) return;

    const result = await createConversationUseCase.execute(validation.data);
    res.json(result);
  } catch (error) {
    req.log?.error({ err: error }, 'Error creating conversation');
    res.status(500).json({ error: 'Failed to create conversation' });
  }
}

export async function listConversations(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const validation = validateQuery(
      ListConversationsQuerySchema,
      req.query,
      res
    );
    if (!validation.success) return;

    const conversationService = getConversationService();
    const conversations = await conversationService.listConversations(
      validation.data.userId
    );
    res.json({ conversations });
  } catch (error) {
    req.log?.error({ err: error }, 'Error listing conversations');
    res.status(500).json({ error: 'Failed to list conversations' });
  }
}

export async function getMessages(req: Request, res: Response): Promise<void> {
  try {
    const validation = validateParams(
      ConversationIdParamSchema,
      req.params,
      res
    );
    if (!validation.success) return;

    const conversationService = getConversationService();
    const messages = await conversationService.getMessages(validation.data.id);
    const visibleMessages = messages.filter((m) => m.role !== 'system');
    res.json({ messages: visibleMessages });
  } catch (error) {
    req.log?.error({ err: error }, 'Error getting messages');
    res.status(500).json({ error: 'Failed to get messages' });
  }
}

export async function chat(req: Request, res: Response): Promise<void> {
  try {
    const validation = validateBody(ChatSchema, req.body, res);
    if (!validation.success) return;

    const result = await sendMessageUseCase.execute(validation.data);
    res.json(result);
  } catch (error) {
    req.log?.error({ err: error }, 'Chat error');
    res.status(500).json({
      error: 'Erreur lors de la génération de la réponse',
      response: 'Désolé, une erreur est survenue. Réessaie plus tard.',
    });
  }
}

export async function chatStream(req: Request, res: Response): Promise<void> {
  try {
    const validation = validateBody(ChatStreamSchema, req.body, res);
    if (!validation.success) return;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    for await (const event of streamMessageUseCase.execute(validation.data)) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    res.end();
  } catch (error) {
    req.log?.error({ err: error }, 'Stream error');

    if (!res.headersSent) {
      res.status(500).json({ error: 'Erreur lors du streaming' });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
      res.end();
    }
  }
}
