import type {
  HybridSearchOptions,
  HybridSearchResult,
} from '../../services/rag/types.js';

export type { HybridSearchOptions, HybridSearchResult };

export interface IHybridSearchService {
  search(
    query: string,
    options?: HybridSearchOptions
  ): Promise<HybridSearchResult[]>;
}
