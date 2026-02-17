import { Router } from 'express';
import { getPool } from '../../db/client';
import { StorageProvider } from '../../storage';

export function createHealthRoutes(storage: StorageProvider): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    let dbStatus = 'disconnected';
    try {
      await getPool().query('SELECT 1');
      dbStatus = 'connected';
    } catch {
      dbStatus = 'error';
    }

    let storageStatus = 'ok';
    try {
      await storage.exists('__health_check');
    } catch {
      storageStatus = 'error';
    }

    const status = dbStatus === 'connected' && storageStatus === 'ok' ? 'ok' : 'degraded';
    const code = status === 'ok' ? 200 : 503;

    res.status(code).json({
      status,
      db: dbStatus,
      storage: storageStatus,
      version: '1.0.0',
    });
  });

  return router;
}
