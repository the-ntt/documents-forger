import { Request, Response, NextFunction } from 'express';
import { AuthMiddleware } from './AuthMiddleware';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: string };
    }
  }
}

export class NoAuthMiddleware implements AuthMiddleware {
  protect(req: Request, _res: Response, next: NextFunction): void {
    req.user = { id: 'local', role: 'admin' };
    next();
  }

  optional(req: Request, _res: Response, next: NextFunction): void {
    req.user = { id: 'local', role: 'admin' };
    next();
  }
}
