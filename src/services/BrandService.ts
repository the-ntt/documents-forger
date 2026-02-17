import { getPool } from '../db/client';
import { StorageProvider } from '../storage';
import { JobService } from './JobService';
import logger from '../logger';

export interface Brand {
  id: string;
  slug: string;
  name: string;
  source_url: string | null;
  source_type: 'url' | 'pdf';
  status: string;
  config: Record<string, unknown>;
  error_message: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface BrandAsset {
  id: string;
  brand_id: string;
  asset_type: string;
  file_path: string;
  created_at: string;
}

export class BrandService {
  private storage: StorageProvider;
  private jobService: JobService;

  constructor(storage: StorageProvider, jobService: JobService) {
    this.storage = storage;
    this.jobService = jobService;
  }

  async create(params: {
    name: string;
    slug: string;
    sourceUrl?: string;
    sourceType: 'url' | 'pdf';
    pdfStoragePath?: string;
    sources?: Array<{ type: string; url?: string; storagePath?: string }>;
  }): Promise<{ brand: Brand; jobId: string }> {
    const pool = getPool();

    const { rows } = await pool.query(
      `INSERT INTO brands (name, slug, source_url, source_type, sources)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [params.name, params.slug, params.sourceUrl || null, params.sourceType, JSON.stringify(params.sources || [])]
    );
    const brand = rows[0] as Brand;

    const job = await this.jobService.create({
      type: 'brand_extraction',
      entityType: 'brand',
      entityId: brand.id,
      payload: {
        brandId: brand.id,
        slug: brand.slug,
        sourceType: params.sourceType,
        sourceUrl: params.sourceUrl,
        pdfStoragePath: params.pdfStoragePath,
        sources: params.sources,
      },
    });

    logger.info(`Brand created: ${brand.slug} (${brand.id}), job: ${job.id}`);
    return { brand, jobId: job.id };
  }

  async approve(slug: string): Promise<{ jobId: string }> {
    const brand = await this.getBySlug(slug);
    if (!brand) throw new Error(`Brand not found: ${slug}`);
    if (brand.status !== 'awaiting_review') {
      throw new Error(`Brand must be in awaiting_review status to approve (current: ${brand.status})`);
    }

    await this.updateStatus(brand.id, 'extracted');

    const job = await this.jobService.create({
      type: 'brand_template_generation',
      entityType: 'brand',
      entityId: brand.id,
      payload: { brandId: brand.id, slug: brand.slug },
    });

    return { jobId: job.id };
  }

  async list(): Promise<Array<Brand & { document_count: number }>> {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT b.*, COUNT(d.id)::int as document_count
       FROM brands b
       LEFT JOIN documents d ON d.brand_id = b.id
       WHERE b.archived = FALSE
       GROUP BY b.id
       ORDER BY b.created_at DESC`
    );
    return rows;
  }

  async getBySlug(slug: string): Promise<Brand | null> {
    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM brands WHERE slug = $1 AND archived = FALSE', [slug]);
    return rows[0] || null;
  }

  async getAssets(brandId: string): Promise<BrandAsset[]> {
    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM brand_assets WHERE brand_id = $1', [brandId]);
    return rows;
  }

  async getAssetByType(brandId: string, assetType: string): Promise<BrandAsset | null> {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT * FROM brand_assets WHERE brand_id = $1 AND asset_type = $2',
      [brandId, assetType]
    );
    return rows[0] || null;
  }

  async updateStatus(brandId: string, status: string, errorMessage?: string): Promise<void> {
    const pool = getPool();
    await pool.query(
      'UPDATE brands SET status = $2, error_message = $3 WHERE id = $1',
      [brandId, status, errorMessage || null]
    );
  }

  async updateConfig(slug: string, config: Record<string, unknown>): Promise<Brand> {
    const pool = getPool();
    const { rows } = await pool.query(
      `UPDATE brands SET config = config || $2::jsonb WHERE slug = $1 AND archived = FALSE RETURNING *`,
      [slug, JSON.stringify(config)]
    );
    if (rows.length === 0) throw new Error(`Brand not found: ${slug}`);
    return rows[0];
  }

  async archive(slug: string): Promise<void> {
    const pool = getPool();
    const { rowCount } = await pool.query(
      'UPDATE brands SET archived = TRUE WHERE slug = $1',
      [slug]
    );
    if (rowCount === 0) throw new Error(`Brand not found: ${slug}`);
  }

  async upsertAsset(brandId: string, assetType: string, filePath: string): Promise<void> {
    const pool = getPool();
    await pool.query(
      `INSERT INTO brand_assets (brand_id, asset_type, file_path)
       VALUES ($1, $2, $3)
       ON CONFLICT (brand_id, asset_type) DO UPDATE SET file_path = $3, created_at = NOW()`,
      [brandId, assetType, filePath]
    );
  }

  async deletePermanently(slug: string): Promise<void> {
    const pool = getPool();
    const brand = await this.getBySlug(slug);
    if (!brand) throw new Error(`Brand not found: ${slug}`);

    // Delete stored files
    const assets = await this.getAssets(brand.id);
    for (const asset of assets) {
      try { await this.storage.delete(asset.file_path); } catch { /* ignore */ }
    }

    await pool.query('DELETE FROM brands WHERE id = $1', [brand.id]);
  }

  async reExtract(slug: string): Promise<string> {
    const brand = await this.getBySlug(slug);
    if (!brand) throw new Error(`Brand not found: ${slug}`);
    if (!brand.source_url && brand.source_type === 'url') {
      throw new Error('Brand has no source URL to re-extract from');
    }

    await this.updateStatus(brand.id, 'pending', null as unknown as string);

    const job = await this.jobService.create({
      type: 'brand_extraction',
      entityType: 'brand',
      entityId: brand.id,
      payload: {
        brandId: brand.id,
        slug: brand.slug,
        sourceType: brand.source_type,
        sourceUrl: brand.source_url,
        pdfStoragePath: brand.source_type === 'pdf' ? `brands/${brand.slug}/source.pdf` : undefined,
      },
    });

    return job.id;
  }

  async regenerateTemplates(slug: string): Promise<string> {
    const brand = await this.getBySlug(slug);
    if (!brand) throw new Error(`Brand not found: ${slug}`);

    const job = await this.jobService.create({
      type: 'brand_template_generation',
      entityType: 'brand',
      entityId: brand.id,
      payload: { brandId: brand.id, slug: brand.slug },
    });

    return job.id;
  }
}
