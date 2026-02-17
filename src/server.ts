import dotenv from 'dotenv';
dotenv.config();

import { createApp, createAppContext } from './app';
import logger, { enableDbLogging } from './logger';

async function main(): Promise<void> {
  const ctx = createAppContext();
  const app = createApp(ctx);
  const port = parseInt(process.env.PORT || '3000');

  // Seed default prompts
  try {
    await ctx.promptService.seedDefaults();
  } catch (err) {
    logger.warn('Failed to seed default prompts (DB may not be ready):', err);
  }

  // Enable persisting logs to database
  try {
    enableDbLogging();
  } catch (err) {
    logger.warn('Failed to enable DB logging:', err);
  }

  // Start job runner
  ctx.jobRunner.start();

  app.listen(port, () => {
    logger.info(`BrandForge server listening on port ${port}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    ctx.jobRunner.stop();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
