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

const DEFAULT_TIMEOUT = 30000;
const DEFAULT_TOP_K = 3;

/**
 * Client pour le service de reranking (cross-encoder)
 *
 * @example
 * ```ts
 * const client = getRerankClient();
 * const results = await client.rerank('question', documents, 3);
 * ```
 */
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

  /**
   * Vérifie si le service de reranking est disponible
   */
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

  /**
   * Rerank les documents par rapport à la requête
   *
   * @param query - La question/requête de l'utilisateur
   * @param documents - Les documents à reranker
   * @param topK - Nombre de résultats à retourner
   * @returns Les documents rerankés triés par pertinence
   */
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          documents,
          top_k: effectiveTopK,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new RerankAPIError(
          `Rerank request failed: ${response.status} - ${errorText}`
        );
      }

      const data = (await response.json()) as RerankResponse;

      console.log(
        `🔄 Reranked ${documents.length} → ${data.results.length} docs (model: ${data.model})`
      );

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

  /**
   * Réinitialise le cache de disponibilité
   */
  resetAvailability(): void {
    this.available = null;
  }
}

// === Singleton ===

let instance: RerankClient | null = null;

/**
 * Obtient l'instance singleton du client de reranking
 */
export function getRerankClient(): RerankClient {
  if (!instance) {
    instance = new RerankClient();
  }
  return instance;
}

/**
 * Réinitialise l'instance singleton (pour les tests)
 */
export function resetRerankClient(): void {
  instance = null;
}

/**
 * Vérifie si le service de reranking est configuré
 */
export function isRerankConfigured(): boolean {
  return !!process.env.RERANK_SERVICE_URL;
}



