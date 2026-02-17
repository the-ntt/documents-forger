import { getPool } from '../db/client';
import { StorageProvider } from '../storage';
import { JobService } from './JobService';
import logger from '../logger';

export interface Document {
  id: string;
  brand_id: string;
  title: string | null;
  format: 'report' | 'slides';
  markdown_path: string;
  pdf_path: string | null;
  rendered_html: string | null;
  edited_html: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export class DocumentService {
  private storage: StorageProvider;
  private jobService: JobService;

  constructor(storage: StorageProvider, jobService: JobService) {
    this.storage = storage;
    this.jobService = jobService;
  }

  async create(params: {
    brandId: string;
    brandSlug: string;
    title?: string;
    format: 'report' | 'slides';
    markdownContent: string;
  }): Promise<{ document: Document; jobId: string }> {
    const pool = getPool();

    // We'll create the doc first, then save the markdown
    const { rows } = await pool.query(
      `INSERT INTO documents (brand_id, title, format, markdown_path)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [params.brandId, params.title || null, params.format, 'pending']
    );
    const doc = rows[0] as Document;

    // Save markdown via storage
    const mdPath = `documents/${doc.id}/input.md`;
    await this.storage.save(mdPath, params.markdownContent);

    // Update markdown_path
    await pool.query('UPDATE documents SET markdown_path = $2 WHERE id = $1', [doc.id, mdPath]);
    doc.markdown_path = mdPath;

    const job = await this.jobService.create({
      type: 'document_render',
      entityType: 'document',
      entityId: doc.id,
      payload: {
        documentId: doc.id,
        brandId: params.brandId,
        brandSlug: params.brandSlug,
        format: params.format,
      },
    });

    logger.info(`Document created: ${doc.id}, job: ${job.id}`);
    return { document: doc, jobId: job.id };
  }

  async listByBrand(brandId: string): Promise<Document[]> {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT * FROM documents WHERE brand_id = $1 ORDER BY created_at DESC',
      [brandId]
    );
    return rows;
  }

  async getById(id: string): Promise<Document | null> {
    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
    return rows[0] || null;
  }

  async updateStatus(docId: string, status: string, errorMessage?: string): Promise<void> {
    const pool = getPool();
    await pool.query(
      'UPDATE documents SET status = $2, error_message = $3 WHERE id = $1',
      [docId, status, errorMessage || null]
    );
  }

  async setPdfPath(docId: string, pdfPath: string): Promise<void> {
    const pool = getPool();
    await pool.query(
      'UPDATE documents SET pdf_path = $2, status = $3 WHERE id = $1',
      [docId, pdfPath, 'ready']
    );
  }

  async setRenderedHtml(docId: string, html: string): Promise<void> {
    const pool = getPool();
    await pool.query('UPDATE documents SET rendered_html = $2 WHERE id = $1', [docId, html]);
  }

  async saveEditedHtml(docId: string, html: string): Promise<void> {
    const pool = getPool();
    await pool.query('UPDATE documents SET edited_html = $2 WHERE id = $1', [docId, html]);
  }

  async getEditableHtml(docId: string): Promise<string | null> {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT edited_html, rendered_html FROM documents WHERE id = $1',
      [docId]
    );
    if (rows.length === 0) return null;
    return rows[0].edited_html || rows[0].rendered_html || null;
  }

  async getDownloadStream(doc: Document) {
    if (!doc.pdf_path) throw new Error('Document PDF not ready');
    return this.storage.getStream(doc.pdf_path);
  }
}
