/**
 * Ports primaires (driving) pour les use cases AI
 */

// ============================================
// TestAI
// ============================================

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

export interface ITestAIUseCase {
  execute(): Promise<TestAIOutput>;
}

