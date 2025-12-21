import { describe, it, expect, beforeEach } from 'vitest';
import { ChunkingService, getChunkingService, resetChunkingService } from '../ChunkingService.js';

describe('ChunkingService', () => {
  let service: ChunkingService;

  beforeEach(() => {
    resetChunkingService();
    service = new ChunkingService();
  });

  describe('chunkText', () => {
    it('should return single chunk for short text', () => {
      const text = 'This is a short text.';
      
      const result = service.chunkText(text, { chunkSize: 500, overlap: 100 });

      expect(result.totalChunks).toBe(1);
      expect(result.chunks[0].content).toBe(text);
      expect(result.originalLength).toBe(text.length);
    });

    it('should chunk long text into multiple chunks', () => {
      const text = 'A'.repeat(1000);
      
      const result = service.chunkText(text, { chunkSize: 300, overlap: 50 });

      expect(result.totalChunks).toBeGreaterThan(1);
      expect(result.chunks.length).toBeGreaterThan(1);
    });

    it('should respect chunk size limit', () => {
      const text = 'A'.repeat(1000);
      const chunkSize = 200;
      
      const result = service.chunkText(text, { chunkSize, overlap: 50 });

      result.chunks.forEach((chunk) => {
        expect(chunk.content.length).toBeLessThanOrEqual(chunkSize);
      });
    });

    it('should create overlapping chunks', () => {
      const text = 'The quick brown fox jumps over the lazy dog. This is a sentence. Another sentence here. And more content follows.';
      
      const result = service.chunkText(text, { chunkSize: 50, overlap: 10 });

      // With overlap, chunks should share some content
      if (result.chunks.length > 1) {
        const firstChunkEnd = result.chunks[0].endOffset;
        const secondChunkStart = result.chunks[1].startOffset;
        // Second chunk should start before first chunk ends (overlap)
        expect(secondChunkStart).toBeLessThan(firstChunkEnd);
      }
    });

    it('should throw error when overlap >= chunkSize', () => {
      const text = 'Some text';

      expect(() => service.chunkText(text, { chunkSize: 100, overlap: 100 })).toThrow(
        'Overlap (100) must be smaller than chunkSize (100)'
      );

      expect(() => service.chunkText(text, { chunkSize: 100, overlap: 150 })).toThrow(
        'Overlap (150) must be smaller than chunkSize (100)'
      );
    });

    it('should trim whitespace from text', () => {
      const text = '   Some text with whitespace   ';
      
      const result = service.chunkText(text, { chunkSize: 500, overlap: 100 });

      expect(result.chunks[0].content).toBe('Some text with whitespace');
    });

    it('should include correct offsets in chunks', () => {
      const text = 'First chunk content. Second chunk content. Third chunk content.';
      
      const result = service.chunkText(text, { chunkSize: 25, overlap: 5 });

      result.chunks.forEach((chunk) => {
        expect(chunk.startOffset).toBeGreaterThanOrEqual(0);
        expect(chunk.endOffset).toBeLessThanOrEqual(text.length);
        expect(chunk.startOffset).toBeLessThan(chunk.endOffset);
      });
    });

    it('should have sequential chunk indices', () => {
      const text = 'A'.repeat(500);
      
      const result = service.chunkText(text, { chunkSize: 100, overlap: 20 });

      result.chunks.forEach((chunk, idx) => {
        expect(chunk.index).toBe(idx);
      });
    });

    it('should use default options when not provided', () => {
      const text = 'A'.repeat(1000);
      
      const result = service.chunkText(text);

      expect(result.totalChunks).toBeGreaterThan(0);
      expect(result.chunks.length).toBe(result.totalChunks);
    });

    it('should handle empty string', () => {
      const text = '   ';
      
      const result = service.chunkText(text, { chunkSize: 500, overlap: 100 });

      expect(result.totalChunks).toBe(1);
      expect(result.chunks[0].content).toBe('');
    });
  });

  describe('estimateChunkCount', () => {
    it('should return 1 for short text', () => {
      const result = service.estimateChunkCount(100, { chunkSize: 500, overlap: 100 });

      expect(result).toBe(1);
    });

    it('should estimate correct count for long text', () => {
      // With chunkSize=500 and overlap=100, step=400
      // For 1000 chars: (1000 - 100) / 400 = 2.25 → ceil = 3
      const result = service.estimateChunkCount(1000, { chunkSize: 500, overlap: 100 });

      expect(result).toBe(3);
    });

    it('should use default options when not provided', () => {
      const result = service.estimateChunkCount(1000);

      expect(result).toBeGreaterThan(0);
    });
  });

  describe('singleton', () => {
    it('should return same instance from getChunkingService', () => {
      const instance1 = getChunkingService();
      const instance2 = getChunkingService();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = getChunkingService();
      resetChunkingService();
      const instance2 = getChunkingService();

      expect(instance1).not.toBe(instance2);
    });
  });
});

