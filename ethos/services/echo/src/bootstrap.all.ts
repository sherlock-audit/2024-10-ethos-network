import cluster from 'node:cluster';
import { cpus } from 'node:os';
import { duration } from '@ethos/helpers';
import { startEventProcessingWorker } from './bootstrap.events';
import { startHttpApiWorker } from './bootstrap.http-api';
import { config } from './common/config';
import { rootLogger as logger } from './common/logger';
import { startMetricsServer } from './metrics-server';

const WORKERS_HEALTH_CHECK_INTERVAL = duration(10, 'seconds').toMilliseconds();

// Run the server in the same way locally and on prod. But locally spawn only a
// single worker so we don't use all resources.
const numWorkers = Math.max(config.NODE_ENV === 'production' ? cpus().length : 1, 2);
let eventsWorkerId: number;

function createFork(workerType: typeof config.WORKER_TYPE): ReturnType<typeof cluster.fork> {
  const worker = cluster.fork({ WORKER_TYPE: workerType });

  worker.on('exit', (code: number, signal: string) => {
    const data = { signal, code, workerId: worker.id };

    if (signal) {
      logger.info({ data }, 'worker.killed');
    } else if (code !== 0) {
      logger.error({ data }, 'worker.exited');
    } else {
      logger.info({ data }, 'worker.stopped');
    }
  });

  return worker;
}

// If the current process is the primary process, run all the things that have
// to be run only once, like event processing, metrics server.
// Only the API HTTP server is forked.
if (cluster.isPrimary) {
  logger.info({ data: { numWorkers } }, 'bootstrap.all.start');

  for (let i = 0; i < numWorkers; i++) {
    if (i === 0) {
      eventsWorkerId = createFork('events').id;
    } else {
      createFork('http');
    }
  }

  // Metrics server must run on the primary process.
  startMetricsServer().catch((err: unknown) => {
    logger.fatal({ err }, 'Failed to start metrics server');
    process.exit(1);
  });

  // TODO: [CORE-1110] Temporary solution to restart workers if they die.
  // We should have a proper process manager like pm2 or a custom solution
  // to monitor, restart workers and cover them with metrics.
  setInterval(() => {
    const workersCount = Object.keys(cluster.workers ?? {}).length;

    if (workersCount < numWorkers) {
      const needsEventWorker = !Object.values(cluster.workers ?? {}).some(
        (worker) => worker?.id === eventsWorkerId,
      );
      logger.info({ data: { workersCount, numWorkers, needsEventWorker } }, 'workers.restart');

      for (let i = 0; i < numWorkers - workersCount; i++) {
        if (needsEventWorker && i === 0) {
          eventsWorkerId = createFork('events').id;
        } else {
          createFork('http');
        }
      }
    }
  }, WORKERS_HEALTH_CHECK_INTERVAL);
} else {
  const worker = cluster.worker;

  if (!worker) {
    logger.fatal('Unexpected startup condition: non-primary cluster has no worker.');
    process.exit(1);
  }

  if (config.WORKER_TYPE === 'events') {
    logger.info({ workerId: worker.id }, 'Starting event processing worker');
    startEventProcessingWorker();
  } else {
    logger.info({ workerId: worker.id }, 'Starting express server worker');
    startHttpApiWorker();
  }
}
