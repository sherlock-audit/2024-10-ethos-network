import { setTimeout } from 'node:timers/promises';
import { config } from './common/config';
import { rootLogger } from './common/logger';
import { startEventServer, stopEventServer } from './event-server';

const logger = rootLogger.child({ process: 'event-worker' });

export function startEventProcessingWorker(): void {
  // Handle shutdown gracefully
  const signals = ['SIGQUIT', 'SIGTERM', 'SIGINT'];

  signals.forEach((signal) => {
    process.on(signal, () => {
      stopEventWorker(signal).catch((err) => {
        logger.fatal({ err }, 'Failed to shut down the server');
        process.exit(1);
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
  startEventServer().catch((err) => {
    logger.fatal({ err }, 'Failed to start contract events batch job');
    process.exit(1);
  });
}

async function stopEventWorker(reason: string): Promise<void> {
  logger.info(`Received ${reason}. Gracefully shutting down...`);

  await stopEventServer().catch((err) => {
    logger.fatal({ err }, 'Failed to stop contract events batch job');
    process.exit(1);
  });

  // Make sure we wait for all the connections to close on production.
  // Otherwise, exit almost immediately.
  await setTimeout(config.NODE_ENV === 'production' ? 3000 : 500);

  process.exit(0);
}
