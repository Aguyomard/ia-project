/**
 * Utilitaire de retry avec Exponential Backoff
 *
 * @example
 * ```ts
 * const result = await withRetry(
 *   () => fetchData(),
 *   { maxRetries: 3, baseDelay: 1000 }
 * );
 * ```
 */

export interface RetryOptions {
  /** Nombre maximum de tentatives (défaut: 3) */
  maxRetries?: number;
  /** Délai initial en ms (défaut: 1000) */
  baseDelay?: number;
  /** Multiplicateur pour l'exponential backoff (défaut: 2) */
  multiplier?: number;
  /** Délai maximum en ms (défaut: 30000) */
  maxDelay?: number;
  /** Fonction pour déterminer si on doit retry (défaut: retry sur 429, 500, 502, 503, 504) */
  shouldRetry?: (error: unknown) => boolean;
  /** Callback appelé avant chaque retry */
  onRetry?: (attempt: number, delay: number, error: unknown) => void;
}

/** Codes HTTP qui méritent un retry */
const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

/**
 * Détermine si une erreur est "retryable"
 */
function isRetryableError(error: unknown): boolean {
  // Erreur avec status code HTTP
  if (error && typeof error === 'object') {
    const err = error as {
      status?: number;
      statusCode?: number;
      code?: string;
    };

    // Vérifier le status code
    const statusCode = err.status || err.statusCode;
    if (statusCode && RETRYABLE_STATUS_CODES.includes(statusCode)) {
      return true;
    }

    // Erreurs réseau (ECONNRESET, ETIMEDOUT, etc.)
    if (
      err.code &&
      ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'].includes(err.code)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Pause asynchrone
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calcule le délai avec exponential backoff + jitter
 */
function calculateDelay(
  attempt: number,
  baseDelay: number,
  multiplier: number,
  maxDelay: number
): number {
  // Exponential: baseDelay * multiplier^attempt
  const exponentialDelay = baseDelay * Math.pow(multiplier, attempt);

  // Ajouter du jitter (±25%) pour éviter les "thundering herds"
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);

  // Plafonner au maxDelay
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Exécute une fonction avec retry et exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    multiplier = 2,
    maxDelay = 30000,
    shouldRetry = isRetryableError,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Si c'est la dernière tentative ou si l'erreur n'est pas retryable
      if (attempt >= maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Calculer le délai
      const delay = calculateDelay(attempt, baseDelay, multiplier, maxDelay);

      // Callback optionnel
      if (onRetry) {
        onRetry(attempt + 1, delay, error);
      } else {
        console.log(
          `[Retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${Math.round(delay)}ms...`
        );
      }

      // Attendre avant de réessayer
      await sleep(delay);
    }
  }

  // Ne devrait jamais arriver, mais TypeScript veut un return
  throw lastError;
}

/**
 * Décorateur pour ajouter le retry à une méthode
 */
export function Retryable(options: RetryOptions = {}) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      return withRetry(() => originalMethod.apply(this, args), options);
    };

    return descriptor;
  };
}

export default withRetry;

