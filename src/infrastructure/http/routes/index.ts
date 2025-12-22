import { Router, type IRouter } from 'express';
import conversationRoutes from './conversationRoutes.js';
import documentRoutes from './documentRoutes.js';
import aiRoutes from './aiRoutes.js';

const router: IRouter = Router();

// API routes
router.use('/api', conversationRoutes);
router.use('/api', documentRoutes);

// Other routes
router.use('/', aiRoutes);

export default router;

