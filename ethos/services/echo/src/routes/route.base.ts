import { JsonHelper } from '@ethos/helpers';
import { type Request, type Response } from 'express';
import { type Constructor } from 'type-fest';
import { type Service } from '../services/service.base';
import { ServiceError } from '../services/service.error';
import { type AnyRecord } from '../services/service.types';
import { RouteError } from './route.error';

type ServiceConstructor = Constructor<
  Service<any, AnyRecord>,
  ConstructorParameters<typeof Service>
>;

type RunService = (
  req: Request,
  res?: Response,
  headers?: Record<string, string>,
) => Promise<unknown>;

export class Route {
  /**
   * Method to initialize a service and call it with the provided parameters.
   * This function is chainable. Call the `run` method to execute the service.
   *
   * Depending on the use case, the route can call only one service or multiple
   * services and use results from them to render the response.
   *
   * If you only need to call one service, you can call the `run` method and
   * pass `req` and `res`. In this way, the function will send an HTTP response automatically.
   * @example this.initService(ServiceClass, params).run(req, res);
   *
   * If you don’t want to send HTTP response and want to use the data from the
   * service, don’t pass `res` to the `run` method.
   * @example const data = await this.initService(FirstService, params).run(req);
   * this.initService(SecondService, data).run(req, res);
   *
   * @param ServiceClass Service class that extends the base Service class.
   * @param params Object with parameters to be passed to the service.
   * @returns Object with `run` method so it can be called as chainable method.
   */
  initService(ServiceClass: ServiceConstructor, params?: any): { run: RunService } {
    const run: RunService = async (req, res, headers) => {
      const service = new ServiceClass({
        logger: req.logger,
      });

      try {
        const data = await service.run(params);

        // Return data from the service call if res is not provided. Useful when
        // you want to call multiple services in a single route handler.
        if (!res) {
          return data;
        }

        if (res.headersSent) {
          req.logger.warn('Headers already sent. Cannot send response.');

          return undefined;
        }

        if (headers) res.set(headers);

        this.renderSuccess(data, req, res);

        return undefined;
      } catch (err) {
        if (!res) {
          throw err;
        }

        this.renderError(err, req, res);

        return undefined;
      }
    };

    return { run };
  }

  protected renderSuccess(data: unknown, _req: Request, res: Response): void {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ ok: true, data }, JsonHelper.replacer));
  }

  protected renderError(err: unknown, req: Request, res: Response): void {
    if (err instanceof RouteError || err instanceof ServiceError) {
      res.status(err.status ?? 400).json({
        ok: false,
        error: err.toJSON(),
      });

      return;
    }

    req.logger.error({ err }, 'Unexpected error');

    res.status(500).json({
      ok: false,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'Something went wrong! Please try again later.',
        reqId: req.id,
      },
    });
  }
}
