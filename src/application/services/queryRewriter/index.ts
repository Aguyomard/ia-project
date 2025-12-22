import { QueryRewriterService } from './QueryRewriterService.js';
import { getMistralClient } from '../../../infrastructure/external/mistral/index.js';

export type { QueryRewriterConfig } from './types.js';
export { DEFAULT_QUERY_REWRITER_CONFIG } from './types.js';
export { QueryRewriterService } from './QueryRewriterService.js';

let queryRewriterInstance: QueryRewriterService | null = null;

export function getQueryRewriterService(): QueryRewriterService {
  if (!queryRewriterInstance) {
    queryRewriterInstance = new QueryRewriterService(getMistralClient());
  }
  return queryRewriterInstance;
}

export function resetQueryRewriterService(): void {
  queryRewriterInstance = null;
}

