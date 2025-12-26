import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

/**
 * Logger centralisé avec Pino
 * - En dev : format lisible avec pino-pretty
 * - En prod : JSON structuré
 * - En test : niveau error seulement
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (isTest ? 'error' : 'info'),
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    env: process.env.NODE_ENV || 'development',
  },
});

/**
 * Crée un child logger avec un contexte spécifique
 * @example
 * const log = createLogger('MistralClient');
 * log.info({ model: 'mistral-tiny' }, 'API call');
 */
export function createLogger(service: string) {
  return logger.child({ service });
}

/**
 * Crée un child logger avec un requestId pour tracer les requêtes
 */
export function createRequestLogger(requestId: string, service?: string) {
  return logger.child({ requestId, ...(service && { service }) });
}

export type Logger = pino.Logger;
