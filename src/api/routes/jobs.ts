import { Router, Request, Response } from 'express';
import { JobService } from '../../services/JobService';
import { AuthMiddleware } from '../../auth';

export function createJobRoutes(jobService: JobService, auth: AuthMiddleware): Router {
  const router = Router();

  router.get('/:id', auth.protect, async (req: Request, res: Response) => {
    try {
      const job = await jobService.getById(req.params.id);
      if (!job) { res.status(404).json({ error: 'Job not found' }); return; }
      res.json(job);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  return router;
}
