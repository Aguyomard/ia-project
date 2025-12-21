import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IDocumentService } from '../../../ports/out/IDocumentService.js';
import type { ChunkWithDistance } from '../../../../domain/document/index.js';

// Mock dependencies before importing the use case
vi.mock('../../../services/document/index.js', () => ({
  getDocumentService: vi.fn(),
}));

// Import after mocking
import { SearchDocumentsUseCase } from '../SearchDocumentsUseCase.js';

describe('SearchDocumentsUseCase', () => {
  let useCase: SearchDocumentsUseCase;
  let mockDocumentService: IDocumentService;

  const mockSearchResults: ChunkWithDistance[] = [
    {
      id: 1,
      documentId: 1,
      content: 'Relevant chunk content',
      embedding: [0.1, 0.2, 0.3],
      chunkIndex: 0,
      startOffset: 0,
      endOffset: 22,
      createdAt: new Date('2024-01-01'),
      distance: 0.15,
    },
    {
      id: 2,
      documentId: 1,
      content: 'Another relevant chunk',
      embedding: [0.4, 0.5, 0.6],
      chunkIndex: 1,
      startOffset: 23,
      endOffset: 44,
      createdAt: new Date('2024-01-01'),
      distance: 0.25,
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
      searchByQuery: vi.fn().mockResolvedValue(mockSearchResults),
      searchByEmbedding: vi.fn(),
    };

    useCase = new SearchDocumentsUseCase(mockDocumentService);
  });

  it('should search documents with query and default options', async () => {
    const input = { query: 'test query' };

    const result = await useCase.execute(input);

    expect(mockDocumentService.searchByQuery).toHaveBeenCalledWith('test query', {
      limit: 5,
      maxDistance: undefined,
    });
    expect(result.results).toEqual(mockSearchResults);
    expect(result.count).toBe(2);
  });

  it('should search with custom limit', async () => {
    const input = { query: 'test query', limit: 10 };

    await useCase.execute(input);

    expect(mockDocumentService.searchByQuery).toHaveBeenCalledWith('test query', {
      limit: 10,
      maxDistance: undefined,
    });
  });

  it('should search with maxDistance filter', async () => {
    const input = { query: 'test query', maxDistance: 0.5 };

    await useCase.execute(input);

    expect(mockDocumentService.searchByQuery).toHaveBeenCalledWith('test query', {
      limit: 5,
      maxDistance: 0.5,
    });
  });

  it('should return empty results when no matches found', async () => {
    mockDocumentService.searchByQuery = vi.fn().mockResolvedValue([]);

    const input = { query: 'no matches' };

    const result = await useCase.execute(input);

    expect(result.results).toEqual([]);
    expect(result.count).toBe(0);
  });

  it('should search with all options combined', async () => {
    const input = {
      query: 'complex query',
      limit: 20,
      maxDistance: 0.3,
    };

    await useCase.execute(input);

    expect(mockDocumentService.searchByQuery).toHaveBeenCalledWith('complex query', {
      limit: 20,
      maxDistance: 0.3,
    });
  });
});

