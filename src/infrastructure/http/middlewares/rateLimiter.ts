import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import { createLogger } from '../../logging/index.js';

const log = createLogger('RateLimiter');

/**
 * Rate limiter général pour toutes les requêtes API
 * 100 requêtes par minute par IP
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: 60,
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    log.warn(
      {
        ip: req.ip,
        url: req.url,
        method: req.method,
      },
      'Rate limit exceeded (general)'
    );
    res.status(429).json({
      error: 'Too many requests, please try again later.',
      retryAfter: 60,
    });
  },
});

/**
 * Rate limiter strict pour les endpoints coûteux (chat, embeddings)
 * 20 requêtes par minute par IP
 */
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: {
    error: 'Too many chat requests. Please wait before sending more messages.',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    log.warn(
      {
        ip: req.ip,
        url: req.url,
        method: req.method,
        requestId: req.requestId,
      },
      'Rate limit exceeded (chat)'
    );
    res.status(429).json({
      error:
        'Too many chat requests. Please wait before sending more messages.',
      retryAfter: 60,
    });
  },
});

/**
 * Rate limiter pour les endpoints de documents (upload, chunking)
 * 10 requêtes par minute par IP (opérations coûteuses en embeddings)
 */
export const documentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    error: 'Too many document uploads. Please wait before uploading more.',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    log.warn(
      {
        ip: req.ip,
        url: req.url,
        method: req.method,
        requestId: req.requestId,
      },
      'Rate limit exceeded (document)'
    );
    res.status(429).json({
      error: 'Too many document uploads. Please wait before uploading more.',
      retryAfter: 60,
    });
  },
});

/**
 * Rate limiter très permissif pour les health checks
 * 1000 requêtes par minute par IP
 */
export const healthLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
