import { Request, Response, NextFunction } from 'express';
import logger from '../logger';

export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  logger.info(`${req.method} ${req.path}`);
  next();
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error',
  });
}
