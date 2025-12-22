import { DomainError } from '../../../domain/shared/index.js';

/**
 * Erreur de configuration du service de reranking
 */
export class RerankConfigError extends DomainError {
  constructor(message: string) {
    super(message, 'RERANK_CONFIG_ERROR');
  }
}

/**
 * Erreur lors de l'appel au service de reranking
 */
export class RerankAPIError extends DomainError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'RERANK_API_ERROR', originalError);
  }
}

/**
 * Erreur quand le service de reranking n'est pas disponible
 */
export class RerankUnavailableError extends DomainError {
  constructor(message: string = 'Rerank service is not available') {
    super(message, 'RERANK_UNAVAILABLE');
  }
}



