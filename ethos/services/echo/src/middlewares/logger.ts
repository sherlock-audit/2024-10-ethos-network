import { randomUUID } from 'node:crypto';
import { type NextFunction, type Request, type Response } from 'express';
import onFinished from 'on-finished';
import { config } from '../common/config';
import { rootLogger } from '../common/logger';
import { metrics } from '../common/metrics';

const { NODE_ENV } = config;

const summary = metrics.makeSummary({
  name: 'http_requests_in',
  help: 'Statistics for responding to inbound HTTP requests',
  labelNames: ['route', 'method', 'status_code', 'invoking_service'],
});

export function logger(req: Request, res: Response, next: NextFunction): void {
  const invokingService = req.get('X-Ethos-Service') ?? 'unknown';

  req.id = randomUUID();

  req.logger = rootLogger.child({
    req,
    req_id: req.id,
    invokingService,
  });

  const allowedToLog =
    !req.originalUrl.startsWith('/healthcheck') && !req.originalUrl.startsWith('/deepcheck');

  if (allowedToLog) {
    const startTime = Date.now();

    onFinished(res, () => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      summary
        .labels({
          route: req.route?.path,
          method: req.method,
          status_code: res.statusCode,
          invoking_service: invokingService,
        })
        .observe(responseTime);

      res.responseTime = responseTime;

      if (NODE_ENV === 'production') {
        req.logger.info({ res }, 'request.info');
      } else {
        req.logger.trace({ res }, 'request.info');
      }
    });
  }

  next();
}
