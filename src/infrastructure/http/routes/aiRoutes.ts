import { Router, type IRouter } from 'express';
import { testAI } from '../controllers/aiController.js';

const router: IRouter = Router();

router.get('/ai-test', testAI);

export default router;

