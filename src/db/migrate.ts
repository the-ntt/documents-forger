import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import { getPool, closePool } from './client';
import logger from '../logger';

async function migrate(): Promise<void> {
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const migrationsDir = path.join(__dirname, 'migrations');
  // In compiled output, migrations won't be there. Check source too.
  const possibleDirs = [
    migrationsDir,
    path.join(__dirname, '..', '..', 'src', 'db', 'migrations'),
  ];

  let sqlDir = '';
  for (const dir of possibleDirs) {
    if (fs.existsSync(dir)) {
      sqlDir = dir;
      break;
    }
  }

  if (!sqlDir) {
    logger.error('No migrations directory found');
    process.exit(1);
  }

  const files = fs.readdirSync(sqlDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const { rows: applied } = await pool.query('SELECT name FROM _migrations');
  const appliedSet = new Set(applied.map((r) => r.name));

  for (const file of files) {
    if (appliedSet.has(file)) {
      logger.info(`Skipping already applied: ${file}`);
      continue;
    }

    logger.info(`Applying migration: ${file}`);
    const sql = fs.readFileSync(path.join(sqlDir, file), 'utf-8');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      logger.info(`Applied: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error(`Failed to apply ${file}:`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  logger.info('All migrations applied');
  await closePool();
}

migrate().catch((err) => {
  logger.error('Migration failed:', err);
  process.exit(1);
});
