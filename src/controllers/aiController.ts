import type { Request, Response } from 'express';
import { getMistralService } from '../services/mistral/index.js';

interface AIComparisonResponse {
  cookie: {
    description: string;
    avantages: string[];
    inconvenients: string[];
  };
  localStorage: {
    description: string;
    avantages: string[];
    inconvenients: string[];
  };
  conclusion: string;
}

/**
 * GET /ai-test - Tester Mistral AI avec réponse JSON
 */
export async function testAI(req: Request, res: Response): Promise<void> {
  try {
    console.log('🤖 Envoi de la requête à Mistral (mode JSON)...');

    const mistral = getMistralService();
    const response = await mistral.chatJSON<AIComparisonResponse>(
      'Compare cookie et localStorage pour le stockage web.',
      {
        systemPrompt: 'Tu es un expert technique senior en développement web.',
      }
    );

    console.log('✅ Réponse JSON reçue de Mistral');

    res.json({
      result: 200,
      message: 'Mistral AI fonctionne !',
      data: response,
    });
  } catch (error) {
    console.error('❌ Erreur Mistral:', error);
    res.status(500).json({
      result: 500,
      error: 'Erreur avec Mistral AI',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
