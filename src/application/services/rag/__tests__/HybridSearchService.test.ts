import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HybridSearchService } from '../HybridSearchService.js';
import type { IDocumentService } from '../../../ports/out/IDocumentService.js';
import type {
  ChunkWithDistance,
  ChunkWithRank,
} from '../../../../domain/document/index.js';

describe('HybridSearchService', () => {
  let service: HybridSearchService;
  let mockDocumentService: IDocumentService;

  const mockVectorResults: ChunkWithDistance[] = [
    {
      id: 1,
      documentId: 1,
      documentTitle: 'Doc A',
      content: 'Content A',
      chunkIndex: 0,
      embedding: [],
      distance: 0.1,
    },
    {
      id: 2,
      documentId: 2,
      documentTitle: 'Doc B',
      content: 'Content B',
      chunkIndex: 0,
      embedding: [],
      distance: 0.2,
    },
    {
      id: 3,
      documentId: 3,
      documentTitle: 'Doc C',
      content: 'Content C',
      chunkIndex: 0,
      embedding: [],
      distance: 0.3,
    },
  ];

  const mockKeywordResults: ChunkWithRank[] = [
    {
      id: 2,
      documentId: 2,
      documentTitle: 'Doc B',
      content: 'Content B',
      chunkIndex: 0,
      rank: 0.9,
    },
    {
      id: 4,
      documentId: 4,
      documentTitle: 'Doc D',
      content: 'Content D',
      chunkIndex: 0,
      rank: 0.8,
    },
    {
      id: 1,
      documentId: 1,
      documentTitle: 'Doc A',
      content: 'Content A',
      chunkIndex: 0,
      rank: 0.7,
    },
  ];

  beforeEach(() => {
    mockDocumentService = {
      createDocument: vi.fn(),
      getDocument: vi.fn(),
      getDocumentWithChunks: vi.fn(),
      listDocuments: vi.fn(),
      countDocuments: vi.fn(),
      deleteDocument: vi.fn(),
      addChunksToDocument: vi.fn(),
      countChunks: vi.fn(),
      searchByQuery: vi.fn().mockResolvedValue(mockVectorResults),
      searchByEmbedding: vi.fn(),
      searchByKeywords: vi.fn().mockResolvedValue(mockKeywordResults),
    };

    service = new HybridSearchService(mockDocumentService);
  });

  it('should call both vector and keyword search', async () => {
    await service.search('test query');

    expect(mockDocumentService.searchByQuery).toHaveBeenCalledWith(
      'test query',
      expect.objectContaining({ limit: 20 })
    );
    expect(mockDocumentService.searchByKeywords).toHaveBeenCalledWith(
      'test query',
      20
    );
  });

  it('should return fused results with RRF scores', async () => {
    const results = await service.search('test query');

    expect(results.length).toBeGreaterThan(0);
    results.forEach((result) => {
      expect(result).toHaveProperty('rrfScore');
      expect(result.rrfScore).toBeGreaterThan(0);
    });
  });

  it('should rank documents found in both searches higher', async () => {
    const results = await service.search('test query');

    // Doc B (id=2) and Doc A (id=1) are in both searches
    // They should have higher RRF scores than Doc C (only vector) or Doc D (only keyword)
    const docB = results.find((r) => r.id === 2);
    const docA = results.find((r) => r.id === 1);
    const docC = results.find((r) => r.id === 3);
    const docD = results.find((r) => r.id === 4);

    expect(docB).toBeDefined();
    expect(docA).toBeDefined();

    // Docs in both searches have both vectorRank and keywordRank
    expect(docB?.vectorRank).toBeDefined();
    expect(docB?.keywordRank).toBeDefined();
    expect(docA?.vectorRank).toBeDefined();
    expect(docA?.keywordRank).toBeDefined();

    // Docs in only one search have only one rank
    expect(docC?.vectorRank).toBeDefined();
    expect(docC?.keywordRank).toBeUndefined();
    expect(docD?.vectorRank).toBeUndefined();
    expect(docD?.keywordRank).toBeDefined();

    // Combined docs should have higher scores
    if (docB && docC) {
      expect(docB.rrfScore).toBeGreaterThan(docC.rrfScore);
    }
    if (docA && docD) {
      expect(docA.rrfScore).toBeGreaterThan(docD.rrfScore);
    }
  });

  it('should respect limit option', async () => {
    const results = await service.search('test query', { limit: 2 });

    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('should pass maxDistance to vector search', async () => {
    await service.search('test query', { maxDistance: 0.5 });

    expect(mockDocumentService.searchByQuery).toHaveBeenCalledWith(
      'test query',
      expect.objectContaining({ maxDistance: 0.5 })
    );
  });

  it('should return empty array when no results', async () => {
    vi.mocked(mockDocumentService.searchByQuery).mockResolvedValue([]);
    vi.mocked(mockDocumentService.searchByKeywords).mockResolvedValue([]);

    const results = await service.search('test query');

    expect(results).toEqual([]);
  });

  it('should handle results from only vector search', async () => {
    vi.mocked(mockDocumentService.searchByKeywords).mockResolvedValue([]);

    const results = await service.search('test query');

    expect(results.length).toBe(3);
    results.forEach((result) => {
      expect(result.vectorRank).toBeDefined();
      expect(result.keywordRank).toBeUndefined();
    });
  });

  it('should handle results from only keyword search', async () => {
    vi.mocked(mockDocumentService.searchByQuery).mockResolvedValue([]);

    const results = await service.search('test query');

    expect(results.length).toBe(3);
    results.forEach((result) => {
      expect(result.vectorRank).toBeUndefined();
      expect(result.keywordRank).toBeDefined();
    });
  });

  it('should sort results by RRF score descending', async () => {
    const results = await service.search('test query');

    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].rrfScore).toBeGreaterThanOrEqual(
        results[i].rrfScore
      );
    }
  });

  it('should preserve document metadata', async () => {
    const results = await service.search('test query');

    const docA = results.find((r) => r.id === 1);
    expect(docA).toBeDefined();
    expect(docA?.documentId).toBe(1);
    expect(docA?.documentTitle).toBe('Doc A');
    expect(docA?.content).toBe('Content A');
    expect(docA?.chunkIndex).toBe(0);
  });
});
