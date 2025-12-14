import { Router } from 'express';
import {
  createConversation,
  listConversations,
  getMessages,
  chat,
} from '../controllers/conversationController.js';

const router = Router();

// Conversations
router.post('/conversations', createConversation);
router.get('/conversations', listConversations);
router.get('/conversations/:id/messages', getMessages);

// Chat
router.post('/chat', chat);

export default router;

