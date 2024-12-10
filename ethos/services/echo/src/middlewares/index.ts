import { duration } from '@ethos/helpers';
import * as Sentry from '@sentry/node';
import compression from 'compression';
import cors from 'cors';
import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import { config } from '../common/config.js';
import { ExpressError } from '../common/errors/express-error.js';
import { initChaosMiddleware } from './chaos.js';
import { logger } from './logger.js';
import { RouteFlags } from './route.flags.js';

const DEFAULT_TIMEOUT = duration(30, 'seconds').toMilliseconds();
const routeFlags = new RouteFlags();

export function initMiddlewares(app: Express): void {
  Sentry.setupExpressErrorHandler(app);

  app
    .use(helmet())
    .use(cors())
    .use(express.json())
    .use(logger)
    .use(routeFlags.authorize())
    .use((req: Request, res: Response, next: NextFunction) => {
      req.context = {};

      req.setTimeout(DEFAULT_TIMEOUT, () => {
        const err = new ExpressError('Request Timeout', {
          code: 'REQUEST_TIMEOUT',
          expose: true,
          status: 408,
        });

        next(err);
      });

      res.setTimeout(DEFAULT_TIMEOUT, () => {
        const err = new ExpressError('Service Unavailable', {
          code: 'SERVICE_UNAVAILABLE',
          expose: true,
          status: 503,
        });

        next(err);
      });

      next();
    })
    // Make sure our responses are properly gzipped
    .use(compression());

  if (config.NODE_ENV === 'development') {
    initChaosMiddleware(app, config.CHAOS_PERCENTAGE_RATE);
  }
}
