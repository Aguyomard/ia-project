import { Router } from 'express';
import { healthCheck, healthCheckSimple } from '../controllers/healthController.js';
import { healthLimiter } from '../middlewares/index.js';

const router: Router = Router();

// Health checks (très permissif - utilisé par monitoring)
router.get('/health', healthLimiter, healthCheck);
router.get('/health/live', healthLimiter, healthCheckSimple);

export default router;

