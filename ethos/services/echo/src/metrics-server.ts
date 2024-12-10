import { type Server } from 'node:http';
import express, { type Request, type Response } from 'express';
import { config } from './common/config.js';
import { rootLogger as logger, rootLogger } from './common/logger.js';
import { getMetrics, initDefaultMetrics } from './common/metrics.js';
import { prisma } from './data/db.js';
import { initErrorHandler } from './middlewares/error-handler.js';

const { PORT_ECHO_METRICS } = config;
const host = '0.0.0.0';

const app = express();

initErrorHandler(app);

let server: Server;

export async function startMetricsServer(): Promise<void> {
  initDefaultMetrics();

  app.get('/metrics', (_req: Request, res: Response) => {
    const prismaMetrics = prisma.$metrics.prometheus({
      globalLabels: {
        deployId: config.DEPLOYMENT_ID,
      },
    });
    const promMetrics = getMetrics();

    Promise.all([prismaMetrics, promMetrics])
      .then((results) => {
        res.set('Content-Type', results[1].contentType);

        res.send(results[0] + '\n' + results[1].metrics);
      })
      .catch((err) => {
        rootLogger.error({ err }, 'metrics.failed');

        res.status(500).json({ ok: false });
      });
  });

  await new Promise((resolve) => {
    server = app.listen(PORT_ECHO_METRICS, host, () => {
      logger.info(`Metrics server is running at http://${host}:${PORT_ECHO_METRICS}`);
      resolve(server);
    });
  });
}

export function stopMetricsServer(): void {
  server?.close();
}
