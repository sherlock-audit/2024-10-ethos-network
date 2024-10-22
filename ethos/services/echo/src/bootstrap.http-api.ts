import { setTimeout } from 'node:timers/promises';
import { config } from './common/config';
import { rootLogger } from './common/logger';
import { startServer, stopServer } from './http-server';

const logger = rootLogger.child({ process: 'http-worker' });

export function startHttpApiWorker(): void {
  // Handle shutdown gracefully
  const signals = ['SIGQUIT', 'SIGTERM', 'SIGINT'];

  signals.forEach((signal) => {
    process.on(signal, () => {
      stopWorker(signal).catch((err) => {
        logger.error({ err }, 'Failed to shut down the server');
      });
    });
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaught_exception');
    process.exit(1);
  });

  process.on('unhandledRejection', (err) => {
    logger.error({ err }, 'unhandled_rejection');
  });

  startServer().catch((err) => {
    logger.error({ err }, 'Failed to start server');
  });
}

async function stopWorker(reason: string): Promise<void> {
  logger.info(`Received ${reason}. Gracefully shutting down...`);

  stopServer();

  // Ensure we wait for all the connections to close on production.
  // Otherwise, exit almost immediately.
  await setTimeout(config.NODE_ENV === 'production' ? 3000 : 500);

  process.exit(0);
}
