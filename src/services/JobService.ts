import { getPool } from '../db/client';
import logger from '../logger';

export interface ProgressEntry {
  message: string;
  timestamp: string;
}

export interface Job {
  id: string;
  type: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error_message: string | null;
  progress_log: ProgressEntry[];
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export class JobService {
  async create(params: {
    type: string;
    entityType?: string;
    entityId?: string;
    payload?: Record<string, unknown>;
  }): Promise<Job> {
    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO jobs (type, entity_type, entity_id, payload)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [params.type, params.entityType || null, params.entityId || null, JSON.stringify(params.payload || {})]
    );
    logger.info(`Job created: ${rows[0].id} (${params.type})`);
    return rows[0];
  }

  async getById(id: string): Promise<Job | null> {
    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM jobs WHERE id = $1', [id]);
    return rows[0] || null;
  }

  async markRunning(id: string): Promise<void> {
    const pool = getPool();
    await pool.query(
      `UPDATE jobs SET status = 'running', started_at = NOW() WHERE id = $1`,
      [id]
    );
  }

  async markCompleted(id: string, result?: Record<string, unknown>): Promise<void> {
    const pool = getPool();
    await pool.query(
      `UPDATE jobs SET status = 'completed', completed_at = NOW(), result = $2 WHERE id = $1`,
      [id, JSON.stringify(result || {})]
    );
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    const pool = getPool();
    await pool.query(
      `UPDATE jobs SET status = 'failed', completed_at = NOW(), error_message = $2 WHERE id = $1`,
      [id, errorMessage]
    );
  }

  async addProgressEntry(jobId: string, message: string): Promise<void> {
    const pool = getPool();
    const entry: ProgressEntry = { message, timestamp: new Date().toISOString() };
    await pool.query(
      `UPDATE jobs SET progress_log = progress_log || $2::jsonb WHERE id = $1`,
      [jobId, JSON.stringify([entry])]
    );
    logger.debug(`Job ${jobId} progress: ${message}`);
  }

  async getLatestForEntity(entityType: string, entityId: string): Promise<Job | null> {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT * FROM jobs WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC LIMIT 1`,
      [entityType, entityId]
    );
    return rows[0] || null;
  }

  async getQueuedJobs(limit: number): Promise<Job[]> {
    const pool = getPool();
    const { rows } = await pool.query(
      `UPDATE jobs SET status = 'running', started_at = NOW()
       WHERE id IN (
         SELECT id FROM jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT $1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING *`,
      [limit]
    );
    return rows;
  }
}
