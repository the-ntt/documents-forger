import winston from 'winston';
import { PostgresLogTransport } from './services/LogService';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.combine(winston.format.colorize(), winston.format.simple())
  ),
  transports: [new winston.transports.Console()],
});

/**
 * Call this after the DB pool is initialized to start persisting logs.
 */
export function enableDbLogging(): void {
  logger.add(new PostgresLogTransport({ level: 'debug' }));
  logger.debug('Database log transport enabled');
}

export default logger;
