import { getMistralService } from '../../../services/mistral/index.js';

export interface AIComparisonResponse {
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

export interface TestAIOutput {
  data: AIComparisonResponse;
}

/**
 * Use Case : Tester Mistral AI avec une comparaison cookie/localStorage
 */
export class TestAIUseCase {
  async execute(): Promise<TestAIOutput> {
    console.log('🤖 Envoi de la requête à Mistral (mode JSON)...');

    const mistral = getMistralService();
    const response = await mistral.chatJSON<AIComparisonResponse>(
      'Compare cookie et localStorage pour le stockage web.',
      {
        systemPrompt: 'Tu es un expert technique senior en développement web.',
      }
    );

    console.log('✅ Réponse JSON reçue de Mistral');

    return { data: response };
  }
}

export const testAIUseCase = new TestAIUseCase();

