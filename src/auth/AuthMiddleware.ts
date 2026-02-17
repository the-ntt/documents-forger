import { RequestHandler } from 'express';

export interface AuthMiddleware {
  protect: RequestHandler;
  optional: RequestHandler;
}
