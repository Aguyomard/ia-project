import { Router, type IRouter } from 'express';
import conversationRoutes from './conversationRoutes.js';
import documentRoutes from './documentRoutes.js';
import aiRoutes from './aiRoutes.js';
import healthRoutes from './healthRoutes.js';

const router: IRouter = Router();

// Health check routes (no /api prefix)
router.use('/', healthRoutes);

// API routes
router.use('/api', conversationRoutes);
router.use('/api', documentRoutes);

// Other routes
router.use('/', aiRoutes);

export default router;

