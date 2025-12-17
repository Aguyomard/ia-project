import type {
  ITestAIUseCase,
  AIComparisonResponse,
  TestAIOutput,
} from '../../ports/in/ai.js';
import type { IMistralClient } from '../../ports/out/IMistralClient.js';
import { getMistralClient } from '../../../infrastructure/external/mistral/index.js';

// Re-export types from ports
export type { AIComparisonResponse, TestAIOutput };

/**
 * Use Case : Tester Mistral AI avec une comparaison cookie/localStorage
 */
export class TestAIUseCase implements ITestAIUseCase {
  constructor(private readonly mistralClient: IMistralClient) {}

  async execute(): Promise<TestAIOutput> {
    console.log('🤖 Envoi de la requête à Mistral (mode JSON)...');

    const response = await this.mistralClient.chatJSON<AIComparisonResponse>(
      'Compare cookie et localStorage pour le stockage web.',
      {
        systemPrompt: 'Tu es un expert technique senior en développement web.',
      }
    );

    console.log('✅ Réponse JSON reçue de Mistral');

    return { data: response };
  }
}

// Factory avec injection par défaut
export function createTestAIUseCase(
  mistralClient: IMistralClient = getMistralClient()
): TestAIUseCase {
  return new TestAIUseCase(mistralClient);
}

// Singleton avec dépendances par défaut
export const testAIUseCase = createTestAIUseCase();
