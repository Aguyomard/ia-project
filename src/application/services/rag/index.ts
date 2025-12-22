import { RAGService } from './RAGService.js';
import { HybridSearchService } from './HybridSearchService.js';
import { getDocumentService } from '../document/index.js';
import { getQueryRewriterService } from '../queryRewriter/index.js';
import { getRerankClient } from '../../../infrastructure/external/rerank/index.js';
import { createRAGLogger } from '../../../infrastructure/logging/index.js';

export type { RAGConfig, RAGContext, RAGServiceDependencies } from './types.js';
export { BASE_SYSTEM_PROMPT } from './types.js';
export { RAGService } from './RAGService.js';
export { HybridSearchService } from './HybridSearchService.js';
export { distanceToSimilarity, rerankScoreToSimilarity } from './utils.js';
export { createRAGLogger } from '../../../infrastructure/logging/index.js';

let ragServiceInstance: RAGService | null = null;

export function getRAGService(): RAGService {
  if (!ragServiceInstance) {
    const documentService = getDocumentService();
    ragServiceInstance = new RAGService({
      documentService,
      queryRewriterService: getQueryRewriterService(),
      rerankClient: getRerankClient(),
      hybridSearchService: new HybridSearchService(documentService),
      logger: createRAGLogger(),
    });
  }
  return ragServiceInstance;
}

export function resetRAGService(): void {
  ragServiceInstance = null;
}
