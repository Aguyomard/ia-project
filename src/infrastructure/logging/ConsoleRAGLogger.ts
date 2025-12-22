/**
 * Implémentation console du logger RAG
 * Infrastructure layer - implémente l'interface IRAGLogger
 */

import type { IRAGLogger } from '../../application/ports/out/ILogger.js';

const LOG_PREFIX = {
  info: '📚',
  warn: '⚠️',
  error: '❌',
  rerank: '🔄',
  rewrite: '✏️',
} as const;

/**
 * Logger RAG silencieux (pour les tests)
 */
export class SilentRAGLogger implements IRAGLogger {
  info(): void {}
  warn(): void {}
  error(): void {}
  sources(): void {}
  rerank(): void {}
  rewrite(): void {}
}

/**
 * Logger RAG avec sortie console
 */
export class ConsoleRAGLogger implements IRAGLogger {
  info(message: string): void {
    console.log(`${LOG_PREFIX.info} ${message}`);
  }

  warn(message: string): void {
    console.warn(`${LOG_PREFIX.warn} ${message}`);
  }

  error(message: string, error?: unknown): void {
    console.error(`${LOG_PREFIX.error} ${message}`, error ?? '');
  }

  sources(count: number, details: string): void {
    console.log(`${LOG_PREFIX.info} RAG: ${count} sources (${details})`);
  }

  rerank(before: number, after: number): void {
    console.log(`${LOG_PREFIX.rerank} Reranked ${before} → ${after} chunks`);
  }

  rewrite(original: string, rewritten: string): void {
    console.log(
      `${LOG_PREFIX.rewrite} Query rewrite: "${original}" → "${rewritten}"`
    );
  }
}

