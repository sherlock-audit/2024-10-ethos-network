import { setTimeout } from 'node:timers/promises';
import { duration } from '@ethos/helpers';
import { config } from './common/config.js';
import { rootLogger } from './common/logger.js';
import { FEATURE_GATES, getGlobalFeatureGate, initStatsig } from './common/statsig.js';
import { redis } from './data/redis.js';
import { startEventServer, stopEventServer } from './event-server.js';

const logger = rootLogger.child({ process: 'event-worker', machineId: config.FLY_MACHINE_ID });
const CURRENT_EVENT_PROCESSOR = 'contract-events-processor';
const CHECK_INTERVAL = duration(5, 'seconds').toMilliseconds();
const LOCK_TTL = duration(10, 'seconds').toSeconds();

function startEventProcessingWorkerInternal(): void {
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

  // Remove the lock from Redis and allow another machine to take over
  await redis.del(CURRENT_EVENT_PROCESSOR);

  // Make sure we wait for all the connections to close on production.
  // Otherwise, exit almost immediately.
  await setTimeout(config.NODE_ENV === 'production' ? 3000 : 500);

  process.exit(0);
}

async function checkProcessorOwnership(fn: () => void): Promise<void> {
  try {
    const currentMachineId = await redis.get(CURRENT_EVENT_PROCESSOR);

    // If there is no current processor, we can start processing
    if (!currentMachineId) {
      // Lock the current processor to this machine so no other machine can take over
      await redis.setex(CURRENT_EVENT_PROCESSOR, LOCK_TTL, config.FLY_MACHINE_ID);

      fn();

      logger.info({ machineId: config.FLY_MACHINE_ID }, 'event_processing.started');

      return;
    }

    // If the current processor is this machine, update the expiration of the key
    if (currentMachineId === config.FLY_MACHINE_ID) {
      await redis.expire(CURRENT_EVENT_PROCESSOR, LOCK_TTL);
    }
  } catch (err) {
    logger.error({ err }, 'Failed to check processor ownership');
  }
}

export function startEventProcessingWorker(): void {
  initStatsig()
    .then(() => {
      const isSingleProcessorEnabled = getGlobalFeatureGate(
        FEATURE_GATES.ENSURE_SINGLE_CONTRACT_EVENT_PROCESSOR,
      );

      logger.info({ isSingleProcessorEnabled }, 'event_processing_worker.starting');

      if (isSingleProcessorEnabled) {
        setInterval(() => {
          void checkProcessorOwnership(startEventProcessingWorkerInternal);
        }, CHECK_INTERVAL);
      } else {
        startEventProcessingWorkerInternal();
      }
    })
    .catch((err) => {
      logger.error({ err }, 'Failed to initialize Statsig');
    });
}
