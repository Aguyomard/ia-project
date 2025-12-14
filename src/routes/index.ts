import { Router } from 'express';
import conversationRoutes from './conversationRoutes.js';
import aiRoutes from './aiRoutes.js';

const router = Router();

// API routes
router.use('/api', conversationRoutes);

// Other routes
router.use('/', aiRoutes);

export default router;

