/**
 * Infrastructure - Logging
 * Exports les implémentations de loggers
 */

import type { IRAGLogger } from '../../application/ports/out/ILogger.js';
import { ConsoleRAGLogger, SilentRAGLogger } from './ConsoleRAGLogger.js';

// Logger principal (Pino)
export { logger, createLogger, createRequestLogger, type Logger } from './logger.js';

// Loggers spécialisés RAG
export { ConsoleRAGLogger, SilentRAGLogger };

/**
 * Factory pour créer un logger RAG
 * @param silent - Si true, retourne un logger silencieux (utile pour les tests)
 */
export function createRAGLogger(silent = false): IRAGLogger {
  return silent ? new SilentRAGLogger() : new ConsoleRAGLogger();
}

