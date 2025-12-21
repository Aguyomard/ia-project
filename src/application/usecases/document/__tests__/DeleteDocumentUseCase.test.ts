import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IDocumentService } from '../../../ports/out/IDocumentService.js';

// Mock dependencies before importing the use case
vi.mock('../../../services/document/index.js', () => ({
  getDocumentService: vi.fn(),
}));

// Import after mocking
import { DeleteDocumentUseCase } from '../DeleteDocumentUseCase.js';

describe('DeleteDocumentUseCase', () => {
  let useCase: DeleteDocumentUseCase;
  let mockDocumentService: IDocumentService;

  beforeEach(() => {
    mockDocumentService = {
      createDocument: vi.fn(),
      getDocument: vi.fn(),
      getDocumentWithChunks: vi.fn(),
      listDocuments: vi.fn(),
      countDocuments: vi.fn(),
      deleteDocument: vi.fn().mockResolvedValue(true),
      addChunksToDocument: vi.fn(),
      countChunks: vi.fn(),
      searchByQuery: vi.fn(),
      searchByEmbedding: vi.fn(),
    };

    useCase = new DeleteDocumentUseCase(mockDocumentService);
  });

  it('should delete a document successfully', async () => {
    const input = { id: 1 };

    const result = await useCase.execute(input);

    expect(mockDocumentService.deleteDocument).toHaveBeenCalledWith(1);
    expect(result.success).toBe(true);
    expect(result.id).toBe(1);
  });

  it('should return false when document deletion fails', async () => {
    mockDocumentService.deleteDocument = vi.fn().mockResolvedValue(false);

    const input = { id: 999 };

    const result = await useCase.execute(input);

    expect(result.success).toBe(false);
    expect(result.id).toBe(999);
  });

  it('should pass the correct document id to the service', async () => {
    const input = { id: 42 };

    await useCase.execute(input);

    expect(mockDocumentService.deleteDocument).toHaveBeenCalledWith(42);
  });
});

