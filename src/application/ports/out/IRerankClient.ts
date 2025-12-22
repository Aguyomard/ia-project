import type {
  RerankDocument,
  RerankResult,
} from '../../../infrastructure/external/rerank/types.js';

export interface IRerankClient {
  isConfigured(): boolean;
  isAvailable(): Promise<boolean>;
  rerank(
    query: string,
    documents: RerankDocument[],
    topK?: number
  ): Promise<RerankResult[]>;
}

export type { RerankDocument, RerankResult };
