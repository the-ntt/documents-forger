import { Command } from 'commander';
import { getPool } from '../../db/client';
import { createStorageProvider } from '../../storage';
import logger from '../../logger';

export function registerUtilCommands(program: Command): void {
  program
    .command('migrate')
    .description('Run database migrations')
    .action(async () => {
      // The migrate script is standalone, just delegate
      require('../../db/migrate');
    });

  program
    .command('health')
    .description('Check system health')
    .action(async () => {
      let ok = true;

      // Check DB
      try {
        await getPool().query('SELECT 1');
        console.log('Database: connected');
      } catch {
        console.log('Database: DISCONNECTED');
        ok = false;
      }

      // Check storage
      try {
        const storage = createStorageProvider();
        await storage.exists('__health');
        console.log('Storage: ok');
      } catch {
        console.log('Storage: ERROR');
        ok = false;
      }

      // Check API key
      if (process.env.GEMINI_API_KEY) {
        console.log('Gemini API key: set');
      } else {
        console.log('Gemini API key: NOT SET');
        ok = false;
      }

      process.exit(ok ? 0 : 1);
    });
}
