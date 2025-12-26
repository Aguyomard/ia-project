import type { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  let error = err;
  if (!(err instanceof AppError)) {
    error = new AppError('Erreur interne du serveur', 500);
  }

  const log = req.log;
  if (log) {
    log.error({
      err,
      statusCode: error.statusCode,
      url: req.url,
      method: req.method,
    }, 'Request error');
  }

  res.status(error.statusCode).json({
    success: false,
    error: error.message,
  });
};

