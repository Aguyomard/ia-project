import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createOrder } from './config/db.js';
import { getMistralService } from './services/mistral/index.js';
import { getConversationService } from './services/conversation/index.js';

const SYSTEM_PROMPT =
  'Tu es un assistant IA amical et serviable. Tu réponds en français de manière concise et utile.';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Middlewares
app.use(cors());
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'", // Nécessaire pour GraphiQL
          'https://unpkg.com', // Autoriser GraphiQL à charger ses scripts
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Nécessaire pour le CSS inline de GraphiQL
          'https://unpkg.com', // Autoriser GraphiQL à charger son CSS
        ],
        imgSrc: [
          "'self'",
          'data:', // Autoriser les images en base64
          'https://raw.githubusercontent.com', // Autoriser l'icône de GraphiQL
        ],
      },
    },
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.get('/test', async (req, res) => {
  try {
    const cart = { items: [{ id: 1, name: 'Test Product', price: 10 }] };
    const userId = 'test-user-123';

    console.log('🔄 Creating order...');
    const orderId = await createOrder(cart, userId);
    console.log('✅ Order created with ID:', orderId);

    res.json({
      result: 200,
      message: 'Order created successfully ++**!!!',
      orderId: orderId,
    });
  } catch (error) {
    console.error('❌ Error creating order:', error);
    res.status(500).json({
      result: 500,
      error: 'Failed to create order',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Type pour la réponse JSON de l'IA
interface AIComparisonResponse {
  cookie: {
    description: string;
    avantages: string[];
    inconvenients: string[];
  };
  localStorage: {
    description: string;
    avantages: string[];
    inconvenients: string[];
  };
  conclusion: string;
}

// Créer une nouvelle conversation
app.post('/api/conversations', async (req, res) => {
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
});

// Lister les conversations
app.get('/api/conversations', async (req, res) => {
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
});

// Récupérer les messages d'une conversation
app.get('/api/conversations/:id/messages', async (req, res) => {
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
});

// Endpoint chatbot avec historique
app.post('/api/chat', async (req, res) => {
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

    // Ajouter le message utilisateur à la conversation
    await conversationService.addMessage({
      conversationId,
      role: 'user',
      content: message,
    });

    // Récupérer tout l'historique
    const chatHistory =
      await conversationService.getChatHistory(conversationId);

    // Envoyer l'historique complet à Mistral
    const aiResponse = await mistral.complete(chatHistory);

    if (!aiResponse) {
      throw new Error('Empty response from Mistral');
    }

    // Sauvegarder la réponse de l'IA
    await conversationService.addMessage({
      conversationId,
      role: 'assistant',
      content: aiResponse,
    });

    // Générer un titre si c'est le premier message
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
});

// Endpoint pour tester Mistral AI (réponse JSON)
app.get('/ai-test', async (req, res) => {
  try {
    console.log('🤖 Envoi de la requête à Mistral (mode JSON)...');

    const mistral = getMistralService();
    const response = await mistral.chatJSON<AIComparisonResponse>(
      'Compare cookie et localStorage pour le stockage web.',
      {
        systemPrompt: 'Tu es un expert technique senior en développement web.',
      }
    );

    console.log('✅ Réponse JSON reçue de Mistral');

    // response est directement un objet JS utilisable !
    res.json({
      result: 200,
      message: 'Mistral AI fonctionne !',
      data: response,
    });
  } catch (error) {
    console.error('❌ Erreur Mistral:', error);
    res.status(500).json({
      result: 500,
      error: 'Erreur avec Mistral AI',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

const startServer = async () => {
  try {
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Échec du démarrage du serveur :', error);
    process.exit(1);
  }
};

startServer();
