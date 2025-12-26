import { Router } from 'express';
import { healthCheck, healthCheckSimple } from '../controllers/healthController.js';

const router: Router = Router();

router.get('/health', healthCheck);
router.get('/health/live', healthCheckSimple);

export default router;

