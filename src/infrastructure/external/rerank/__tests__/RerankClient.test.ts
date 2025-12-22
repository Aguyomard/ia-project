import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RerankClient, resetRerankClient } from '../RerankClient.js';

describe('RerankClient', () => {
  const originalEnv = process.env.RERANK_SERVICE_URL;

  beforeEach(() => {
    resetRerankClient();
    process.env.RERANK_SERVICE_URL = 'http://localhost:8001';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.RERANK_SERVICE_URL = originalEnv;
  });

  describe('constructor', () => {
    it('should use RERANK_SERVICE_URL from environment', () => {
      const client = new RerankClient();
      expect(client).toBeDefined();
    });

    it('should use custom serviceUrl from config', () => {
      const client = new RerankClient({ serviceUrl: 'http://custom:8001' });
      expect(client).toBeDefined();
    });

    it('should throw if no URL is configured', () => {
      delete process.env.RERANK_SERVICE_URL;
      expect(() => new RerankClient()).toThrow(
        'RERANK_SERVICE_URL is required'
      );
    });
  });

  describe('isAvailable', () => {
    it('should return true when service is healthy', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'healthy', model_loaded: true }),
      });

      const client = new RerankClient();
      const available = await client.isAvailable();

      expect(available).toBe(true);
    });

    it('should return false when service is not healthy', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      });

      const client = new RerankClient();
      const available = await client.isAvailable();

      expect(available).toBe(false);
    });

    it('should return false on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const client = new RerankClient();
      const available = await client.isAvailable();

      expect(available).toBe(false);
    });

    it('should cache availability result', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'healthy', model_loaded: true }),
      });

      const client = new RerankClient();
      await client.isAvailable();
      await client.isAvailable();

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('rerank', () => {
    it('should return empty array for empty documents', async () => {
      const client = new RerankClient();
      const results = await client.rerank('query', []);

      expect(results).toEqual([]);
    });

    it('should call rerank endpoint with correct payload', async () => {
      const mockResults = {
        results: [
          { id: 1, score: 0.95, content: 'Doc 1' },
          { id: 2, score: 0.85, content: 'Doc 2' },
        ],
        model: 'bge-reranker-base',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResults),
      });

      const client = new RerankClient();
      const documents = [
        { id: 1, content: 'Doc 1' },
        { id: 2, content: 'Doc 2' },
      ];

      const results = await client.rerank('question', documents, 2);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8001/rerank',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: 'question',
            documents,
            top_k: 2,
          }),
        })
      );

      expect(results).toEqual(mockResults.results);
    });

    it('should throw on API error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      const client = new RerankClient();
      const documents = [{ id: 1, content: 'Doc 1' }];

      await expect(client.rerank('query', documents)).rejects.toThrow(
        'Rerank request failed'
      );
    });
  });
});


