import Transport from 'winston-transport';
import { getPool } from '../db/client';

export interface AppLog {
  id: number;
  level: string;
  message: string;
  meta: Record<string, unknown>;
  timestamp: string;
}

export interface LogQuery {
  level?: string;
  search?: string;
  limit?: number;
  offset?: number;
  since?: string;
}

export class LogService {
  async query(params: LogQuery): Promise<{ logs: AppLog[]; total: number }> {
    const pool = getPool();
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (params.level) {
      conditions.push(`level = $${paramIdx++}`);
      values.push(params.level);
    }

    if (params.search) {
      conditions.push(`message ILIKE $${paramIdx++}`);
      values.push(`%${params.search}%`);
    }

    if (params.since) {
      conditions.push(`timestamp >= $${paramIdx++}`);
      values.push(params.since);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = params.limit || 100;
    const offset = params.offset || 0;

    const countResult = await pool.query(
      `SELECT COUNT(*)::int as total FROM app_logs ${where}`,
      values
    );

    const dataResult = await pool.query(
      `SELECT * FROM app_logs ${where} ORDER BY timestamp DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...values, limit, offset]
    );

    return {
      logs: dataResult.rows,
      total: countResult.rows[0].total,
    };
  }

  async prune(): Promise<number> {
    const pool = getPool();
    const result = await pool.query(
      `DELETE FROM app_logs WHERE timestamp < NOW() - INTERVAL '7 days'`
    );
    return result.rowCount || 0;
  }
}

/**
 * Custom Winston transport that writes logs to the app_logs table.
 * Buffers writes to avoid excessive DB calls.
 */
export class PostgresLogTransport extends Transport {
  private buffer: Array<{ level: string; message: string; meta: Record<string, unknown>; timestamp: string }> = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;

  constructor(opts?: Transport.TransportStreamOptions) {
    super(opts);
    // Flush every 2 seconds
    this.flushTimer = setInterval(() => this.flush(), 2000);
  }

  log(info: { level: string; message: string; timestamp?: string; [key: string]: unknown }, callback: () => void): void {
    const { level, message, timestamp, ...rest } = info;

    // Strip winston internal symbols
    const meta: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (typeof k === 'string' && !k.startsWith('Symbol')) {
        meta[k] = v;
      }
    }

    this.buffer.push({
      level,
      message: typeof message === 'string' ? message : String(message),
      meta,
      timestamp: (timestamp as string) || new Date().toISOString(),
    });

    // Flush immediately if buffer is large
    if (this.buffer.length >= 50) {
      this.flush();
    }

    callback();
  }

  private async flush(): Promise<void> {
    if (this.flushing || this.buffer.length === 0) return;
    this.flushing = true;

    const batch = this.buffer.splice(0, this.buffer.length);

    try {
      const pool = getPool();
      // Batch insert using unnest
      const levels = batch.map(b => b.level);
      const messages = batch.map(b => b.message);
      const metas = batch.map(b => JSON.stringify(b.meta));
      const timestamps = batch.map(b => b.timestamp);

      await pool.query(
        `INSERT INTO app_logs (level, message, meta, timestamp)
         SELECT * FROM unnest($1::varchar[], $2::text[], $3::jsonb[], $4::timestamptz[])`,
        [levels, messages, metas, timestamps]
      );
    } catch {
      // If DB write fails, don't crash — logs are best-effort
      // Put items back so they can be retried
      this.buffer.unshift(...batch);
      // Cap buffer to prevent memory issues
      if (this.buffer.length > 500) {
        this.buffer.splice(0, this.buffer.length - 500);
      }
    } finally {
      this.flushing = false;
    }
  }

  close(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }
}
