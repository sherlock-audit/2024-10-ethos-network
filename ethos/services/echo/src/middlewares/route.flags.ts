import { type NextFunction, type Request, type Response } from 'express';
import { metrics } from '../common/metrics';
import { DYNAMIC_CONFIGS, getGlobalDynamicConfig } from '../common/statsig';
import { shouldBlockRoute } from '../routes/route.access';
import { Route } from '../routes/route.base';
import { RouteError } from '../routes/route.error';

export class RouteFlags extends Route {
  authorize() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const method = req.method;
      const path = req.route?.path ?? 'unknown';

      const blockedRoutes = getGlobalDynamicConfig(DYNAMIC_CONFIGS.ECHO_ENDPOINT_GATEWAY);

      if (shouldBlockRoute(method, path, blockedRoutes)) {
        routeAccessCounter.inc({ status: 'blocked', route: path });
        this.renderError(blockedRouteError, req, res);
      } else {
        routeAccessCounter.inc({ status: 'allowed', route: path });
        next();
      }
    };
  }
}

const routeAccessCounter = metrics.makeCounter({
  name: 'route_access',
  help: 'Route access attempts, labeled by status (blocked or allowed)',
  labelNames: ['status', 'route'],
});

const blockedRouteError = new RouteError('API Route Disabled', {
  code: 'API_ROUTE_DISABLED',
  status: 403,
});
