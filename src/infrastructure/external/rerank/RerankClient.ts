import type {
  RerankConfig,
  RerankDocument,
  RerankResult,
  RerankResponse,
  RerankHealthResponse,
} from './types.js';
import {
  RerankConfigError,
  RerankAPIError,
  RerankUnavailableError,
} from './errors.js';
import type { IRerankClient } from '../../../application/ports/out/IRerankClient.js';
import { createLogger } from '../../logging/index.js';

const log = createLogger('RerankClient');

const DEFAULT_TIMEOUT = 30000;
const DEFAULT_TOP_K = 3;

export class RerankClient implements IRerankClient {
  private readonly serviceUrl: string;
  private readonly timeout: number;
  private readonly defaultTopK: number;
  private available: boolean | null = null;

  constructor(config: RerankConfig = {}) {
    const url = config.serviceUrl || process.env.RERANK_SERVICE_URL;

    if (!url) {
      throw new RerankConfigError(
        'RERANK_SERVICE_URL is required. Set it in environment or pass it to constructor.'
      );
    }

    this.serviceUrl = url;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.defaultTopK = config.defaultTopK ?? DEFAULT_TOP_K;
  }

  isConfigured(): boolean {
    return !!this.serviceUrl;
  }

  async isAvailable(): Promise<boolean> {
    if (this.available !== null) {
      return this.available;
    }

    try {
      const response = await fetch(`${this.serviceUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        this.available = false;
        return false;
      }

      const data = (await response.json()) as RerankHealthResponse;
      this.available = data.model_loaded === true;
      return this.available;
    } catch {
      this.available = false;
      return false;
    }
  }

  async rerank(
    query: string,
    documents: RerankDocument[],
    topK?: number
  ): Promise<RerankResult[]> {
    if (documents.length === 0) {
      return [];
    }

    const effectiveTopK = topK ?? this.defaultTopK;

    try {
      const response = await fetch(`${this.serviceUrl}/rerank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, documents, top_k: effectiveTopK }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new RerankAPIError(
          `Rerank request failed: ${response.status} - ${errorText}`
        );
      }

      const data = (await response.json()) as RerankResponse;

      log.info({
        inputDocs: documents.length,
        outputDocs: data.results.length,
        model: data.model,
      }, 'Reranking completed');

      return data.results;
    } catch (error) {
      if (error instanceof RerankAPIError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new RerankUnavailableError('Rerank service timeout');
      }

      throw new RerankAPIError('Failed to rerank documents', error);
    }
  }

  resetAvailability(): void {
    this.available = null;
  }
}

let instance: RerankClient | null = null;

export function getRerankClient(): RerankClient {
  if (!instance) {
    instance = new RerankClient();
  }
  return instance;
}

export function resetRerankClient(): void {
  instance = null;
}

export function isRerankConfigured(): boolean {
  return !!process.env.RERANK_SERVICE_URL;
}
