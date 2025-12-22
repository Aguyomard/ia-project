import { Router, type IRouter } from 'express';
import {
  createConversation,
  listConversations,
  getMessages,
  chat,
  chatStream,
} from '../controllers/conversationController.js';

const router: IRouter = Router();

// Conversations
router.post('/conversations', createConversation);
router.get('/conversations', listConversations);
router.get('/conversations/:id/messages', getMessages);

// Chat
router.post('/chat', chat);
router.post('/chat/stream', chatStream);

export default router;

