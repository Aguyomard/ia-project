import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IDocumentService } from '../../../ports/out/IDocumentService.js';
import type { DocumentWithChunks } from '../../../../domain/document/index.js';

// Mock dependencies before importing the use case
vi.mock('../../../services/document/index.js', () => ({
  getDocumentService: vi.fn(),
}));

// Import after mocking
import { GetDocumentUseCase } from '../GetDocumentUseCase.js';

describe('GetDocumentUseCase', () => {
  let useCase: GetDocumentUseCase;
  let mockDocumentService: IDocumentService;

  const mockDocumentWithChunks: DocumentWithChunks = {
    id: 1,
    content: 'Test document content',
    title: 'Test Title',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    chunks: [
      {
        id: 1,
        documentId: 1,
        content: 'Chunk 1 content',
        embedding: [0.1, 0.2, 0.3],
        chunkIndex: 0,
        startOffset: 0,
        endOffset: 15,
        createdAt: new Date('2024-01-01'),
      },
    ],
  };

  beforeEach(() => {
    mockDocumentService = {
      createDocument: vi.fn(),
      getDocument: vi.fn(),
      getDocumentWithChunks: vi.fn().mockResolvedValue(mockDocumentWithChunks),
      listDocuments: vi.fn(),
      countDocuments: vi.fn(),
      deleteDocument: vi.fn(),
      addChunksToDocument: vi.fn(),
      countChunks: vi.fn(),
      searchByQuery: vi.fn(),
      searchByEmbedding: vi.fn(),
    };

    useCase = new GetDocumentUseCase(mockDocumentService);
  });

  it('should get a document with its chunks by id', async () => {
    const input = { id: 1 };

    const result = await useCase.execute(input);

    expect(mockDocumentService.getDocumentWithChunks).toHaveBeenCalledWith(1);
    expect(result.document).toEqual(mockDocumentWithChunks);
  });

  it('should return document with chunks array', async () => {
    const input = { id: 1 };

    const result = await useCase.execute(input);

    expect(result.document.chunks).toBeDefined();
    expect(result.document.chunks).toHaveLength(1);
    expect(result.document.chunks[0].content).toBe('Chunk 1 content');
  });

  it('should pass the correct document id to the service', async () => {
    const input = { id: 42 };

    await useCase.execute(input);

    expect(mockDocumentService.getDocumentWithChunks).toHaveBeenCalledWith(42);
  });
});

