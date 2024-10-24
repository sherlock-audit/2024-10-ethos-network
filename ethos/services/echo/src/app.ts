import express, { type Express } from 'express';
import { rootLogger as logger } from './common/logger';
import { initStatsig } from './common/statsig';
import { initMiddlewares } from './middlewares';
import { initErrorHandler } from './middlewares/error-handler';
import { executePostMigrationScripts } from './post-migrations';
import { initRoutes } from './routes/routes';

export function initApp(): Express {
  executePostMigrationScripts().catch((err) => {
    logger.error({ err }, 'Failed to execute post migration scripts');
  });

  const app = express();

  initStatsig().catch((err) => {
    logger.error({ err }, 'Failed to initialize Statsig');
  });

  initMiddlewares(app);
  initRoutes(app);
  initErrorHandler(app);

  return app;
}
