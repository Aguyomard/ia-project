import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { createRequestLogger, type Logger } from '../../logging/index.js';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      log: Logger;
    }
  }
}

/**
 * Middleware qui ajoute un requestId unique à chaque requête
 * et un logger contextualisé pour le tracing
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  const log = createRequestLogger(requestId);

  req.requestId = requestId;
  req.log = log;

  res.setHeader('X-Request-ID', requestId);

  const startTime = Date.now();

  log.info(
    {
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
    },
    'Incoming request'
  );

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    log.info(
      {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        durationMs: duration,
      },
      'Request completed'
    );
  });

  next();
}
