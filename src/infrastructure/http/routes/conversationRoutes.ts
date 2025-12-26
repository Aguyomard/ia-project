import { Router, type IRouter } from 'express';
import {
  createConversation,
  listConversations,
  getMessages,
  chat,
  chatStream,
} from '../controllers/conversationController.js';
import { generalLimiter, chatLimiter } from '../middlewares/index.js';

const router: IRouter = Router();

// Conversations (rate limit général)
router.post('/conversations', generalLimiter, createConversation);
router.get('/conversations', generalLimiter, listConversations);
router.get('/conversations/:id/messages', generalLimiter, getMessages);

// Chat (rate limit strict - appels Mistral coûteux)
router.post('/chat', chatLimiter, chat);
router.post('/chat/stream', chatLimiter, chatStream);

export default router;

