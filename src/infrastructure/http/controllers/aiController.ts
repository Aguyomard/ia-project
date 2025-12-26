import type { Request, Response } from 'express';
import { testAIUseCase } from '../../../application/usecases/index.js';

export async function testAI(req: Request, res: Response): Promise<void> {
  try {
    const result = await testAIUseCase.execute();
    res.json({
      result: 200,
      message: 'Mistral AI fonctionne !',
      data: result.data,
    });
  } catch (error) {
    req.log?.error({ err: error }, 'Mistral AI test failed');
    res.status(500).json({
      result: 500,
      error: 'Erreur avec Mistral AI',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
