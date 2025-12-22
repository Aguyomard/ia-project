import { RAGService } from './RAGService.js';
import { createRAGLogger } from '../../../infrastructure/logging/index.js';

export type { RAGConfig, RAGContext, RAGServiceDependencies } from './types.js';
export { BASE_SYSTEM_PROMPT } from './types.js';
export { RAGService } from './RAGService.js';
export { distanceToSimilarity, rerankScoreToSimilarity } from './utils.js';

// Re-export depuis infrastructure pour rétrocompatibilité
export { createRAGLogger } from '../../../infrastructure/logging/index.js';

let ragServiceInstance: RAGService | null = null;

/**
 * Retourne l'instance singleton du RAGService
 * Utilise le logger console par défaut (injecté depuis infrastructure)
 */
export function getRAGService(): RAGService {
  if (!ragServiceInstance) {
    ragServiceInstance = new RAGService({
      logger: createRAGLogger(),
    });
  }
  return ragServiceInstance;
}

/**
 * Réinitialise l'instance singleton (utile pour les tests)
 */
export function resetRAGService(): void {
  ragServiceInstance = null;
}
