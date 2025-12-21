import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IDocumentService } from '../../../ports/out/IDocumentService.js';
import type { Document } from '../../../../domain/document/index.js';

// Mock dependencies before importing the use case
vi.mock('../../../services/document/index.js', () => ({
  getDocumentService: vi.fn(),
}));

// Import after mocking
import { ListDocumentsUseCase } from '../ListDocumentsUseCase.js';

describe('ListDocumentsUseCase', () => {
  let useCase: ListDocumentsUseCase;
  let mockDocumentService: IDocumentService;

  const mockDocuments: Document[] = [
    {
      id: 1,
      content: 'Document 1',
      title: 'Title 1',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 2,
      content: 'Document 2',
      title: 'Title 2',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    },
  ];

  beforeEach(() => {
    mockDocumentService = {
      createDocument: vi.fn(),
      getDocument: vi.fn(),
      getDocumentWithChunks: vi.fn(),
      listDocuments: vi.fn().mockResolvedValue(mockDocuments),
      countDocuments: vi.fn().mockResolvedValue(2),
      deleteDocument: vi.fn(),
      addChunksToDocument: vi.fn(),
      countChunks: vi.fn(),
      searchByQuery: vi.fn(),
      searchByEmbedding: vi.fn(),
    };

    useCase = new ListDocumentsUseCase(mockDocumentService);
  });

  it('should list documents with default pagination', async () => {
    const result = await useCase.execute({});

    expect(mockDocumentService.listDocuments).toHaveBeenCalledWith(100, 0);
    expect(mockDocumentService.countDocuments).toHaveBeenCalled();
    expect(result.documents).toEqual(mockDocuments);
    expect(result.total).toBe(2);
  });

  it('should list documents with custom limit and offset', async () => {
    const input = { limit: 10, offset: 5 };

    await useCase.execute(input);

    expect(mockDocumentService.listDocuments).toHaveBeenCalledWith(10, 5);
  });

  it('should return empty array when no documents exist', async () => {
    mockDocumentService.listDocuments = vi.fn().mockResolvedValue([]);
    mockDocumentService.countDocuments = vi.fn().mockResolvedValue(0);

    const result = await useCase.execute({});

    expect(result.documents).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('should work with no input parameters', async () => {
    const result = await useCase.execute();

    expect(mockDocumentService.listDocuments).toHaveBeenCalledWith(100, 0);
    expect(result).toHaveProperty('documents');
    expect(result).toHaveProperty('total');
  });
});

