import fs from 'fs';
import path from 'path';
import { getPool } from '../db/client';
import logger from '../logger';

export type PromptType = 'extraction' | 'report_template' | 'slides_template';

const PROMPT_FILES: Record<PromptType, string> = {
  extraction: 'extraction.prompt.txt',
  report_template: 'report-template.prompt.txt',
  slides_template: 'slides-template.prompt.txt',
};

export class PromptService {
  private promptsDir: string;

  constructor() {
    const possibleDirs = [
      path.join(__dirname, '..', 'prompts'),
      path.join(__dirname, '..', '..', 'src', 'prompts'),
    ];
    this.promptsDir = possibleDirs.find((d) => fs.existsSync(d)) || possibleDirs[0];
  }

  async seedDefaults(): Promise<void> {
    const pool = getPool();
    const { rows } = await pool.query('SELECT COUNT(*) as count FROM prompts WHERE is_default = TRUE');
    if (parseInt(rows[0].count) > 0) {
      logger.info('Default prompts already seeded');
      return;
    }

    for (const [type, filename] of Object.entries(PROMPT_FILES)) {
      const filePath = path.join(this.promptsDir, filename);
      if (!fs.existsSync(filePath)) {
        logger.warn(`Prompt file not found: ${filePath}`);
        continue;
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      await pool.query(
        `INSERT INTO prompts (type, content, is_default) VALUES ($1, $2, TRUE)
         ON CONFLICT DO NOTHING`,
        [type, content]
      );
      logger.info(`Seeded default prompt: ${type}`);
    }
  }

  async getEffectivePrompt(type: PromptType, brandId?: string): Promise<string> {
    const pool = getPool();

    if (brandId) {
      const { rows } = await pool.query(
        'SELECT content FROM prompts WHERE type = $1 AND brand_id = $2',
        [type, brandId]
      );
      if (rows.length > 0) return rows[0].content;
    }

    const { rows } = await pool.query(
      'SELECT content FROM prompts WHERE type = $1 AND is_default = TRUE',
      [type]
    );
    if (rows.length > 0) return rows[0].content;

    // Fallback to file
    const filename = PROMPT_FILES[type];
    const filePath = path.join(this.promptsDir, filename);
    return fs.readFileSync(filePath, 'utf-8');
  }

  async getAllDefaults(): Promise<Array<{ id: string; type: string; content: string; is_default: boolean }>> {
    const pool = getPool();
    const { rows } = await pool.query('SELECT id, type, content, is_default FROM prompts WHERE is_default = TRUE ORDER BY type');
    return rows;
  }

  async getByType(type: PromptType, brandSlug?: string): Promise<{ id: string; type: string; content: string; brand_id: string | null }> {
    const pool = getPool();

    if (brandSlug) {
      const { rows } = await pool.query(
        `SELECT p.id, p.type, p.content, p.brand_id FROM prompts p
         JOIN brands b ON p.brand_id = b.id
         WHERE p.type = $1 AND b.slug = $2`,
        [type, brandSlug]
      );
      if (rows.length > 0) return rows[0];
    }

    const { rows } = await pool.query(
      'SELECT id, type, content, brand_id FROM prompts WHERE type = $1 AND is_default = TRUE',
      [type]
    );
    if (rows.length === 0) throw new Error(`No prompt found for type: ${type}`);
    return rows[0];
  }

  async upsert(type: PromptType, content: string, brandSlug?: string): Promise<void> {
    const pool = getPool();

    if (brandSlug) {
      const { rows: brands } = await pool.query('SELECT id FROM brands WHERE slug = $1', [brandSlug]);
      if (brands.length === 0) throw new Error(`Brand not found: ${brandSlug}`);
      const brandId = brands[0].id;

      await pool.query(
        `INSERT INTO prompts (type, brand_id, content, is_default)
         VALUES ($1, $2, $3, FALSE)
         ON CONFLICT (type, brand_id) DO UPDATE SET content = $3, updated_at = NOW()`,
        [type, brandId, content]
      );
    } else {
      await pool.query(
        `UPDATE prompts SET content = $1, updated_at = NOW() WHERE type = $2 AND is_default = TRUE`,
        [content, type]
      );
    }
  }
}
