import type { Request, Response } from 'express';
import { getConversationService } from '../services/conversation/index.js';
import { getMistralService } from '../services/mistral/index.js';
import { getDocumentService } from '../services/document/index.js';

const BASE_SYSTEM_PROMPT =
  'Tu es un assistant IA amical et serviable. Tu réponds en français de manière concise et utile.';

/**
 * Construit un system prompt enrichi avec le contexte RAG
 */
async function buildRAGSystemPrompt(userMessage: string): Promise<string> {
  try {
    const documentService = getDocumentService();
    const docCount = await documentService.count();

    // Si pas de documents, retourner le prompt de base
    if (docCount === 0) {
      return BASE_SYSTEM_PROMPT;
    }

    // Chercher les documents pertinents
    const relevantDocs = await documentService.searchSimilar(userMessage, {
      limit: 3,
      maxDistance: 0.7, // Ignorer les docs trop éloignés
    });

    // Si aucun document pertinent, retourner le prompt de base
    if (relevantDocs.length === 0) {
      return BASE_SYSTEM_PROMPT;
    }

    // Construire le contexte
    const context = relevantDocs
      .map((doc, i) => `[Document ${i + 1}]\n${doc.content}`)
      .join('\n\n---\n\n');

    console.log(
      `📚 RAG: ${relevantDocs.length} documents trouvés (distances: ${relevantDocs.map((d) => d.distance.toFixed(2)).join(', ')})`
    );

    return `${BASE_SYSTEM_PROMPT}

Tu as accès aux documents suivants pour t'aider à répondre :

${context}

Instructions :
- Utilise ces documents pour répondre si pertinent
- Si l'information n'est pas dans les documents, utilise tes connaissances générales
- Ne mentionne pas explicitement "selon les documents" sauf si l'utilisateur le demande`;
  } catch (error) {
    console.error('⚠️ RAG search failed, using base prompt:', error);
    return BASE_SYSTEM_PROMPT;
  }
}

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
      content: BASE_SYSTEM_PROMPT,
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

    console.log(
      '💬 Chat message:',
      message,
      'in conversation:',
      conversationId
    );

    const conversationService = getConversationService();
    const mistral = getMistralService();

    // Ajouter le message utilisateur
    await conversationService.addMessage({
      conversationId,
      role: 'user',
      content: message,
    });

    // Récupérer l'historique
    const chatHistory =
      await conversationService.getChatHistory(conversationId);

    // 🆕 RAG : Enrichir le system prompt avec les documents pertinents
    const enrichedSystemPrompt = await buildRAGSystemPrompt(message);
    if (chatHistory.length > 0 && chatHistory[0].role === 'system') {
      chatHistory[0].content = enrichedSystemPrompt;
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
    res.json({ response: aiResponse, conversationId });
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

    console.log('🌊 Stream chat:', message, 'in conversation:', conversationId);

    const conversationService = getConversationService();
    const mistral = getMistralService();

    // Ajouter le message utilisateur
    await conversationService.addMessage({
      conversationId,
      role: 'user',
      content: message,
    });

    // Récupérer l'historique
    const chatHistory =
      await conversationService.getChatHistory(conversationId);

    // 🆕 RAG : Enrichir le system prompt avec les documents pertinents
    const enrichedSystemPrompt = await buildRAGSystemPrompt(message);
    if (chatHistory.length > 0 && chatHistory[0].role === 'system') {
      chatHistory[0].content = enrichedSystemPrompt;
    }

    // Configurer SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    // Collecter la réponse complète pour la sauvegarder
    let fullResponse = '';

    // Streamer les chunks
    for await (const chunk of mistral.streamComplete(chatHistory)) {
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
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

    // Envoyer l'événement de fin
    res.write(`data: ${JSON.stringify({ done: true, fullResponse })}\n\n`);
    res.end();

    console.log('✅ Stream completed');
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
