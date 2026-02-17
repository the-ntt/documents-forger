import { Router, Request, Response } from 'express';
import multer from 'multer';
import { BrandService } from '../../services/BrandService';
import { JobService } from '../../services/JobService';
import { ExtractionService } from '../../services/ExtractionService';
import { ConversationService } from '../../services/ConversationService';
import { StorageProvider } from '../../storage';
import { AuthMiddleware } from '../../auth';

export function createBrandRoutes(
  brandService: BrandService,
  storage: StorageProvider,
  auth: AuthMiddleware,
  jobService: JobService,
  extractionService: ExtractionService,
  conversationService: ConversationService,
): Router {
  const router = Router();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

  router.post('/', auth.protect, upload.array('pdfs', 10), async (req: Request, res: Response) => {
    try {
      const { name, slug, sourceUrl, sourceType } = req.body;

      if (!name || !slug) {
        res.status(400).json({ error: 'name and slug are required' });
        return;
      }

      // F2: Multi-source support
      const urlsRaw = req.body.urls;
      const urls: string[] = urlsRaw ? (typeof urlsRaw === 'string' ? JSON.parse(urlsRaw) : urlsRaw) : [];
      const pdfFiles = (req.files as Express.Multer.File[]) || [];

      // Build sources array
      const sources: Array<{ type: string; url?: string; storagePath?: string }> = [];
      for (const url of urls) {
        if (url.trim()) sources.push({ type: 'url', url: url.trim() });
      }
      for (let i = 0; i < pdfFiles.length; i++) {
        const storagePath = `brands/${slug}/source-${i}.pdf`;
        await storage.save(storagePath, pdfFiles[i].buffer);
        sources.push({ type: 'pdf', storagePath });
      }

      // Legacy single-source fallback
      if (sources.length === 0 && sourceType) {
        if (!['url', 'pdf'].includes(sourceType)) {
          res.status(400).json({ error: 'sourceType must be url or pdf' });
          return;
        }
        let pdfStoragePath: string | undefined;
        if (sourceType === 'pdf') {
          const singleFile = pdfFiles[0] || (req as unknown as { file?: Express.Multer.File }).file;
          if (!singleFile) {
            res.status(400).json({ error: 'PDF file is required when sourceType is pdf' });
            return;
          }
          pdfStoragePath = `brands/${slug}/source.pdf`;
          await storage.save(pdfStoragePath, singleFile.buffer);
        }
        const result = await brandService.create({
          name, slug,
          sourceUrl: sourceType === 'url' ? sourceUrl : undefined,
          sourceType,
          pdfStoragePath,
        });
        res.status(201).json(result);
        return;
      }

      if (sources.length === 0) {
        res.status(400).json({ error: 'At least one URL or PDF source is required' });
        return;
      }

      const result = await brandService.create({
        name, slug,
        sourceUrl: sources.find(s => s.type === 'url')?.url,
        sourceType: sources[0].type as 'url' | 'pdf',
        sources,
      });

      res.status(201).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('duplicate key')) {
        res.status(409).json({ error: `Brand with slug already exists` });
        return;
      }
      res.status(500).json({ error: message });
    }
  });

  router.get('/', auth.protect, async (_req: Request, res: Response) => {
    try {
      const brands = await brandService.list();
      res.json(brands);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  router.get('/:slug', auth.protect, async (req: Request, res: Response) => {
    try {
      const brand = await brandService.getBySlug(req.params.slug);
      if (!brand) { res.status(404).json({ error: 'Brand not found' }); return; }

      const assets = await brandService.getAssets(brand.id);
      const latestJob = await jobService.getLatestForEntity('brand', brand.id);
      res.json({ ...brand, assets, latestJob });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  router.post('/:slug/re-extract', auth.protect, async (req: Request, res: Response) => {
    try {
      const jobId = await brandService.reExtract(req.params.slug);
      res.json({ jobId });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('not found')) { res.status(404).json({ error: message }); return; }
      res.status(500).json({ error: message });
    }
  });

  router.post('/:slug/regenerate-templates', auth.protect, async (req: Request, res: Response) => {
    try {
      const jobId = await brandService.regenerateTemplates(req.params.slug);
      res.json({ jobId });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('not found')) { res.status(404).json({ error: message }); return; }
      res.status(500).json({ error: message });
    }
  });

  router.patch('/:slug/config', auth.protect, async (req: Request, res: Response) => {
    try {
      const { config } = req.body;
      if (!config || typeof config !== 'object') {
        res.status(400).json({ error: 'config object is required' });
        return;
      }
      const brand = await brandService.updateConfig(req.params.slug, config);
      res.json(brand);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('not found')) { res.status(404).json({ error: message }); return; }
      res.status(500).json({ error: message });
    }
  });

  router.delete('/:slug', auth.protect, async (req: Request, res: Response) => {
    try {
      await brandService.deletePermanently(req.params.slug);
      res.json({ success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('not found')) { res.status(404).json({ error: message }); return; }
      res.status(500).json({ error: message });
    }
  });

  // F2: Approve brand after review
  router.post('/:slug/approve', auth.protect, async (req: Request, res: Response) => {
    try {
      const result = await brandService.approve(req.params.slug);
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('not found')) { res.status(404).json({ error: message }); return; }
      res.status(400).json({ error: message });
    }
  });

  // F2: Brand conversation for design system refinement
  router.post('/:slug/conversation', auth.protect, async (req: Request, res: Response) => {
    try {
      const brand = await brandService.getBySlug(req.params.slug);
      if (!brand) { res.status(404).json({ error: 'Brand not found' }); return; }

      const { message } = req.body;
      if (!message) { res.status(400).json({ error: 'message is required' }); return; }

      // Get or create active conversation
      let conversation = await conversationService.getActive(brand.id);
      if (!conversation) {
        conversation = await conversationService.create(brand.id);
      }

      // Add user message
      await conversationService.addMessage(conversation.id, 'user', message);

      // Load current design system
      const dsAsset = await brandService.getAssetByType(brand.id, 'design_system');
      const currentHtml = dsAsset ? (await storage.get(dsAsset.file_path)).toString() : '';

      // Get full conversation history
      const updated = await conversationService.getById(conversation.id);
      const history = updated?.messages || [];

      // Call AI to refine
      const aiResponse = await extractionService.refineDesignSystem(currentHtml, message, history);
      await conversationService.addMessage(conversation.id, 'assistant', aiResponse.text);
      await conversationService.incrementRound(conversation.id);

      const final = await conversationService.getById(conversation.id);
      const roundNumber = final?.round_number || 0;
      const maxRounds = final?.max_rounds || 5;

      // If AI returned updated HTML, save it
      if (aiResponse.updatedHtml) {
        const dsPath = `brands/${brand.slug}/design-system.html`;
        await storage.save(dsPath, aiResponse.updatedHtml);
      }

      // If max rounds reached, complete conversation
      let isComplete = false;
      if (roundNumber >= maxRounds) {
        await conversationService.complete(conversation.id);
        isComplete = true;
      }

      res.json({
        response: aiResponse.text,
        roundNumber,
        maxRounds,
        isComplete,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  router.get('/:slug/assets/:assetType', auth.protect, async (req: Request, res: Response) => {
    try {
      const brand = await brandService.getBySlug(req.params.slug);
      if (!brand) { res.status(404).json({ error: 'Brand not found' }); return; }

      const asset = await brandService.getAssetByType(brand.id, req.params.assetType);
      if (!asset) { res.status(404).json({ error: 'Asset not found' }); return; }

      const content = await storage.get(asset.file_path);
      res.setHeader('Content-Type', 'text/html');
      res.send(content);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  return router;
}
