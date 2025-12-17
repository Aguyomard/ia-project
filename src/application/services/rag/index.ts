import { RAGService } from './RAGService.js';

export type { RAGConfig, RAGContext } from './types.js';
export { BASE_SYSTEM_PROMPT } from './types.js';
export { RAGService } from './RAGService.js';

let ragServiceInstance: RAGService | null = null;

export function getRAGService(): RAGService {
  if (!ragServiceInstance) {
    ragServiceInstance = new RAGService();
  }
  return ragServiceInstance;
}
