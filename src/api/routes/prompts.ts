import { Router, Request, Response } from 'express';
import { PromptService, PromptType } from '../../services/PromptService';
import { AuthMiddleware } from '../../auth';

const VALID_TYPES: PromptType[] = ['extraction', 'report_template', 'slides_template'];

export function createPromptRoutes(promptService: PromptService, auth: AuthMiddleware): Router {
  const router = Router();

  router.get('/', auth.protect, async (_req: Request, res: Response) => {
    try {
      const prompts = await promptService.getAllDefaults();
      res.json(prompts);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  router.get('/:type', auth.protect, async (req: Request, res: Response) => {
    try {
      const type = req.params.type as PromptType;
      if (!VALID_TYPES.includes(type)) {
        res.status(400).json({ error: `Invalid prompt type. Must be one of: ${VALID_TYPES.join(', ')}` });
        return;
      }

      const brandSlug = req.query.brandSlug as string | undefined;
      const prompt = await promptService.getByType(type, brandSlug);
      res.json(prompt);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  router.put('/:type', auth.protect, async (req: Request, res: Response) => {
    try {
      const type = req.params.type as PromptType;
      if (!VALID_TYPES.includes(type)) {
        res.status(400).json({ error: `Invalid prompt type` });
        return;
      }

      const { content, brandSlug } = req.body;
      if (!content) {
        res.status(400).json({ error: 'content is required' });
        return;
      }

      await promptService.upsert(type, content, brandSlug);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  return router;
}
