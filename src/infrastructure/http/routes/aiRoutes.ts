import { Router } from 'express';
import { testAI } from '../controllers/aiController.js';

const router = Router();

router.get('/ai-test', testAI);

export default router;

