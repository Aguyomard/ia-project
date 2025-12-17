import type {
  ITestAIUseCase,
  AIComparisonResponse,
  TestAIOutput,
} from '../../ports/in/ai.js';
import type { IMistralClient } from '../../ports/out/IMistralClient.js';
import { getMistralClient } from '../../../infrastructure/external/mistral/index.js';

export type { AIComparisonResponse, TestAIOutput };

export class TestAIUseCase implements ITestAIUseCase {
  constructor(private readonly mistralClient: IMistralClient) {}

  async execute(): Promise<TestAIOutput> {
    const response = await this.mistralClient.chatJSON<AIComparisonResponse>(
      'Compare cookie et localStorage pour le stockage web.',
      {
        systemPrompt: 'Tu es un expert technique senior en développement web.',
      }
    );

    return { data: response };
  }
}

export function createTestAIUseCase(
  mistralClient: IMistralClient = getMistralClient()
): TestAIUseCase {
  return new TestAIUseCase(mistralClient);
}

export const testAIUseCase = createTestAIUseCase();
