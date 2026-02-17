import { Router, Request, Response } from 'express';
import multer from 'multer';
import { DocumentService } from '../../services/DocumentService';
import { BrandService } from '../../services/BrandService';
import { RenderService } from '../../services/RenderService';
import { FileConversionService } from '../../services/FileConversionService';
import { StorageProvider } from '../../storage';
import { AuthMiddleware } from '../../auth';

export function createDocumentRoutes(
  documentService: DocumentService,
  brandService: BrandService,
  storage: StorageProvider,
  auth: AuthMiddleware,
  renderService: RenderService,
  fileConversionService: FileConversionService,
): Router {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ['.md', '.txt', '.markdown', '.docx', '.pdf', '.pptx'];
      const ext = '.' + (file.originalname.split('.').pop()?.toLowerCase() || '');
      if (allowed.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error(`Unsupported file type: ${ext}`));
      }
    },
  });

  // Brand-scoped routes
  router.post('/brands/:slug/documents', auth.protect, upload.single('file'), async (req: Request, res: Response) => {
    try {
      const brand = await brandService.getBySlug(req.params.slug);
      if (!brand) { res.status(404).json({ error: 'Brand not found' }); return; }

      if (brand.status !== 'ready') {
        res.status(400).json({ error: 'Brand templates are not ready yet' });
        return;
      }

      let markdownContent: string;
      let title = req.body.title;
      const format = req.body.format;

      if (!format || !['report', 'slides'].includes(format)) {
        res.status(400).json({ error: 'format must be report or slides' });
        return;
      }

      if (req.file) {
        // F3: File upload conversion
        markdownContent = await fileConversionService.convertToMarkdown(
          req.file.buffer,
          req.file.mimetype,
          req.file.originalname
        );
        if (!title) {
          title = req.file.originalname.replace(/\.[^.]+$/, '');
        }
      } else {
        markdownContent = req.body.markdownContent;
        if (!markdownContent) {
          res.status(400).json({ error: 'markdownContent or file upload is required' });
          return;
        }
      }

      const result = await documentService.create({
        brandId: brand.id,
        brandSlug: brand.slug,
        title,
        format,
        markdownContent,
      });

      res.status(201).json(result);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  router.get('/brands/:slug/documents', auth.protect, async (req: Request, res: Response) => {
    try {
      const brand = await brandService.getBySlug(req.params.slug);
      if (!brand) { res.status(404).json({ error: 'Brand not found' }); return; }

      const docs = await documentService.listByBrand(brand.id);
      res.json(docs);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // Document by ID routes
  router.get('/documents/:id', auth.protect, async (req: Request, res: Response) => {
    try {
      const doc = await documentService.getById(req.params.id);
      if (!doc) { res.status(404).json({ error: 'Document not found' }); return; }

      const downloadUrl = doc.pdf_path ? storage.getPublicUrl(doc.pdf_path) : null;
      res.json({ ...doc, downloadUrl });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  router.get('/documents/:id/download', auth.protect, async (req: Request, res: Response) => {
    try {
      const doc = await documentService.getById(req.params.id);
      if (!doc) { res.status(404).json({ error: 'Document not found' }); return; }
      if (!doc.pdf_path) { res.status(404).json({ error: 'PDF not ready' }); return; }

      const stream = await storage.getStream(doc.pdf_path);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${doc.title || 'document'}.pdf"`);
      stream.pipe(res);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // F4: Get editable HTML
  router.get('/documents/:id/html', auth.protect, async (req: Request, res: Response) => {
    try {
      const html = await documentService.getEditableHtml(req.params.id);
      if (!html) { res.status(404).json({ error: 'No rendered HTML available' }); return; }
      res.json({ html });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // F4: Save edited HTML
  router.patch('/documents/:id/content', auth.protect, async (req: Request, res: Response) => {
    try {
      const { editedHtml } = req.body;
      if (!editedHtml) { res.status(400).json({ error: 'editedHtml is required' }); return; }

      const doc = await documentService.getById(req.params.id);
      if (!doc) { res.status(404).json({ error: 'Document not found' }); return; }

      await documentService.saveEditedHtml(req.params.id, editedHtml);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // F4: Re-render PDF from edited HTML
  router.post('/documents/:id/re-render', auth.protect, async (req: Request, res: Response) => {
    try {
      const doc = await documentService.getById(req.params.id);
      if (!doc) { res.status(404).json({ error: 'Document not found' }); return; }

      const html = doc.edited_html || doc.rendered_html;
      if (!html) { res.status(400).json({ error: 'No HTML to render' }); return; }

      const pdfPath = `documents/${doc.id}/output.pdf`;
      await renderService.renderHtmlDirectly(html, doc.format, pdfPath);
      await documentService.setPdfPath(doc.id, pdfPath);

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // F5: Download as Word document
  router.get('/documents/:id/download/docx', auth.protect, async (req: Request, res: Response) => {
    try {
      const doc = await documentService.getById(req.params.id);
      if (!doc) { res.status(404).json({ error: 'Document not found' }); return; }

      const html = doc.edited_html || doc.rendered_html;
      if (!html) { res.status(400).json({ error: 'No HTML available for conversion' }); return; }

      const htmlDocx = await import('html-docx-js');
      const converter = htmlDocx.default || htmlDocx;
      const docxResult = converter.asBlob(html);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${doc.title || 'document'}.docx"`);

      // html-docx-js returns a Blob in browser or Buffer-like in Node
      if (Buffer.isBuffer(docxResult)) {
        res.send(docxResult);
      } else if (docxResult instanceof ArrayBuffer) {
        res.send(Buffer.from(docxResult));
      } else if (typeof docxResult === 'object' && docxResult !== null && 'arrayBuffer' in docxResult) {
        const ab = await (docxResult as Blob).arrayBuffer();
        res.send(Buffer.from(ab));
      } else {
        res.send(Buffer.from(docxResult as unknown as string, 'binary'));
      }
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  return router;
}
