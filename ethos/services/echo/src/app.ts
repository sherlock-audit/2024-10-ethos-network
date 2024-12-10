import express, { type Express } from 'express';
import { rootLogger as logger } from './common/logger.js';
import { initStatsig } from './common/statsig.js';
import { initErrorHandler } from './middlewares/error-handler.js';
import { initMiddlewares } from './middlewares/index.js';
import { initRoutes } from './routes/routes.js';

export function initApp(): Express {
  const app = express();

  initStatsig()
    .then(() => {
      // Initialize middlewares, routes, and error handler only after Statsig is
      // initialized as some middlewares and routes depend on Statsig
      initMiddlewares(app);
      initRoutes(app);
      initErrorHandler(app);
    })
    .catch((err) => {
      logger.error({ err }, 'Failed to initialize Statsig');
    });

  return app;
}
