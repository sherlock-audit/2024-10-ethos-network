import { randomUUID } from 'node:crypto';
import { type Express, type NextFunction, type Request, type Response } from 'express';
import { ExpressError } from '../common/errors/express-error';
import { rootLogger } from '../common/logger';

export function initErrorHandler(app: Express): void {
  app.use(errorHandler);
}

function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (!req.logger) {
    req.id = randomUUID();

    req.logger = rootLogger.child({
      req,
      req_id: req.id,
    });
  }

  if (err instanceof ExpressError) {
    res.status(err.status ?? 500).json({
      ok: false,
      error: {
        message: err.expose ? err.message : 'Something went wrong! Please try again later.',
        code: err.expose ? err.code : 'UNEXPECTED_ERROR',
      },
    });

    return;
  }

  req.logger.error({ err }, 'unexpected_error');

  res.status(500).json({
    ok: false,
    error: {
      message: 'Something went wrong! Please try again later.',
      code: 'UNEXPECTED_ERROR',
      reqId: req.id,
    },
  });
}
