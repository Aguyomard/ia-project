import type {
  ChunkWithDistance,
  ChunkWithRank,
  SearchOptions,
} from '../../../domain/document/index.js';
import type { IDocumentService } from '../../ports/out/IDocumentService.js';
import {
  DEFAULT_KEYWORD_WEIGHT,
  DEFAULT_RRF_K,
  DEFAULT_VECTOR_WEIGHT,
  type HybridSearchOptions,
  type HybridSearchResult,
} from './types.js';

export type { HybridSearchResult, HybridSearchOptions };

export class HybridSearchService {
  private readonly documentService: IDocumentService;

  constructor(documentService: IDocumentService) {
    this.documentService = documentService;
  }

  async search(
    query: string,
    options: HybridSearchOptions = {}
  ): Promise<HybridSearchResult[]> {
    const {
      limit = 10,
      maxDistance,
      vectorWeight = DEFAULT_VECTOR_WEIGHT,
      keywordWeight = DEFAULT_KEYWORD_WEIGHT,
      rrfK = DEFAULT_RRF_K,
    } = options;

    const searchOptions: SearchOptions = {
      limit: limit * 2,
      maxDistance,
    };

    const [vectorResults, keywordResults] = await Promise.all([
      this.documentService.searchByQuery(query, searchOptions),
      this.documentService.searchByKeywords(query, limit * 2),
    ]);

    return this.fuseResults(vectorResults, keywordResults, {
      vectorWeight,
      keywordWeight,
      rrfK,
      limit,
    });
  }

  private fuseResults(
    vectorResults: ChunkWithDistance[],
    keywordResults: ChunkWithRank[],
    options: {
      vectorWeight: number;
      keywordWeight: number;
      rrfK: number;
      limit: number;
    }
  ): HybridSearchResult[] {
    const { vectorWeight, keywordWeight, rrfK, limit } = options;
    const scoreMap = new Map<number, HybridSearchResult>();

    vectorResults.forEach((chunk, index) => {
      const vectorRank = index + 1;
      const vectorScore = vectorWeight / (rrfK + vectorRank);

      scoreMap.set(chunk.id, {
        id: chunk.id,
        documentId: chunk.documentId,
        documentTitle: chunk.documentTitle ?? null,
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
        vectorRank,
        rrfScore: vectorScore,
        distance: chunk.distance,
      });
    });

    keywordResults.forEach((chunk, index) => {
      const keywordRank = index + 1;
      const keywordScore = keywordWeight / (rrfK + keywordRank);

      const existing = scoreMap.get(chunk.id);
      if (existing) {
        existing.keywordRank = keywordRank;
        existing.rrfScore += keywordScore;
      } else {
        scoreMap.set(chunk.id, {
          id: chunk.id,
          documentId: chunk.documentId,
          documentTitle: chunk.documentTitle,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          keywordRank,
          rrfScore: keywordScore,
        });
      }
    });

    const results = Array.from(scoreMap.values());
    results.sort((a, b) => b.rrfScore - a.rrfScore);

    return results.slice(0, limit);
  }
}
