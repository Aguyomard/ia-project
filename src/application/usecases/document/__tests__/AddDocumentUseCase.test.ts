import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IDocumentService } from '../../../ports/out/IDocumentService.js';
import type { Document } from '../../../../domain/document/index.js';

// Mock dependencies before importing the use case
vi.mock('../../../services/document/index.js', () => ({
  getDocumentService: vi.fn(),
}));

// Import after mocking
import { AddDocumentUseCase } from '../AddDocumentUseCase.js';

describe('AddDocumentUseCase', () => {
  let useCase: AddDocumentUseCase;
  let mockDocumentService: IDocumentService;

  const mockDocument: Document = {
    id: 1,
    content: 'Test document content',
    title: 'Test Title',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    mockDocumentService = {
      createDocument: vi.fn().mockResolvedValue(mockDocument),
      getDocument: vi.fn(),
      getDocumentWithChunks: vi.fn(),
      listDocuments: vi.fn(),
      countDocuments: vi.fn(),
      deleteDocument: vi.fn(),
      addChunksToDocument: vi.fn(),
      countChunks: vi.fn(),
      searchByQuery: vi.fn(),
      searchByEmbedding: vi.fn(),
    };

    useCase = new AddDocumentUseCase(mockDocumentService);
  });

  it('should create a document with title and content', async () => {
    const input = {
      content: 'Test document content',
      title: 'Test Title',
    };

    const result = await useCase.execute(input);

    expect(mockDocumentService.createDocument).toHaveBeenCalledWith({
      content: input.content,
      title: input.title,
    });
    expect(result.document).toEqual(mockDocument);
  });

  it('should create a document without title', async () => {
    const input = {
      content: 'Test document content',
    };

    await useCase.execute(input);

    expect(mockDocumentService.createDocument).toHaveBeenCalledWith({
      content: input.content,
      title: undefined,
    });
  });

  it('should return the created document', async () => {
    const input = { content: 'Some content' };

    const result = await useCase.execute(input);

    expect(result).toHaveProperty('document');
    expect(result.document.id).toBe(1);
    expect(result.document.content).toBe('Test document content');
  });
});

