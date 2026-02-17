import { Router, Request, Response } from 'express';
import { LogService } from '../../services/LogService';
import { AuthMiddleware } from '../../auth';

export function createLogRoutes(logService: LogService, auth: AuthMiddleware): Router {
  const router = Router();

  router.get('/', auth.protect, async (req: Request, res: Response) => {
    try {
      const level = req.query.level as string | undefined;
      const search = req.query.search as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const since = req.query.since as string | undefined;

      const result = await logService.query({ level, search, limit, offset, since });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  router.delete('/prune', auth.protect, async (_req: Request, res: Response) => {
    try {
      const deleted = await logService.prune();
      res.json({ deleted });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  return router;
}
