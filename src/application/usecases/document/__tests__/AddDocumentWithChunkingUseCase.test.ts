import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AddDocumentWithChunkingUseCase } from '../AddDocumentWithChunkingUseCase.js';
import type { ChunkingService } from '../../../services/chunking/ChunkingService.js';

// Mock des dépendances globales
vi.mock('../../../../infrastructure/persistence/index.js', () => ({
  getDocumentRepository: vi.fn(() => ({
    createDocument: vi.fn().mockResolvedValue({
      id: 1,
      content: 'Test content',
      title: 'Test content',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    }),
    createChunk: vi.fn().mockImplementation((data) => ({
      id: Math.floor(Math.random() * 1000),
      documentId: data.documentId,
      content: data.content,
      embedding: data.embedding,
      chunkIndex: data.chunkIndex,
      startOffset: data.startOffset,
      endOffset: data.endOffset,
      createdAt: new Date('2024-01-01'),
    })),
  })),
}));

vi.mock('../../../../infrastructure/external/mistral/index.js', () => ({
  getMistralClient: vi.fn(() => ({
    generateEmbeddings: vi.fn().mockResolvedValue([
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.6],
    ]),
  })),
}));

describe('AddDocumentWithChunkingUseCase', () => {
  let useCase: AddDocumentWithChunkingUseCase;
  let mockChunkingService: ChunkingService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockChunkingService = {
      chunkText: vi.fn().mockReturnValue({
        chunks: [
          { content: 'Chunk 1 content', index: 0, startOffset: 0, endOffset: 15 },
          { content: 'Chunk 2 content', index: 1, startOffset: 10, endOffset: 25 },
        ],
        totalChunks: 2,
        originalLength: 25,
      }),
      estimateChunkCount: vi.fn().mockReturnValue(2),
    } as unknown as ChunkingService;

    useCase = new AddDocumentWithChunkingUseCase(mockChunkingService);
  });

  it('should chunk text and create document with chunks', async () => {
    const input = {
      content: 'This is a test document that should be chunked',
      chunkSize: 500,
      overlap: 100,
    };

    const result = await useCase.execute(input);

    expect(mockChunkingService.chunkText).toHaveBeenCalledWith(input.content, {
      chunkSize: 500,
      overlap: 100,
    });
    expect(result.document).toBeDefined();
    expect(result.totalChunks).toBe(2);
    expect(result.chunkInfos).toHaveLength(2);
  });

  it('should use default chunk size and overlap when not provided', async () => {
    const input = {
      content: 'This is a test document',
    };

    await useCase.execute(input);

    expect(mockChunkingService.chunkText).toHaveBeenCalledWith(input.content, {
      chunkSize: undefined,
      overlap: undefined,
    });
  });

  it('should return chunk infos with correct structure', async () => {
    const input = { content: 'Test content for chunking' };

    const result = await useCase.execute(input);

    expect(result.chunkInfos[0]).toHaveProperty('content');
    expect(result.chunkInfos[0]).toHaveProperty('index');
    expect(result.chunkInfos[0]).toHaveProperty('startOffset');
    expect(result.chunkInfos[0]).toHaveProperty('endOffset');
  });

  it('should return the original length of the document', async () => {
    const input = { content: 'Test content' };

    const result = await useCase.execute(input);

    expect(result.originalLength).toBe(25);
  });

  it('should create chunks with embeddings', async () => {
    const input = { content: 'Test content for embeddings' };

    const result = await useCase.execute(input);

    expect(result.chunks).toHaveLength(2);
    result.chunks.forEach((chunk) => {
      expect(chunk.embedding).toBeDefined();
      expect(Array.isArray(chunk.embedding)).toBe(true);
    });
  });
});

