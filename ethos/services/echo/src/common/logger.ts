import { type Logger, getLogger } from '@ethos/logger';
import { type Request, type Response } from 'express';
import { pick } from 'lodash';
import { pino, type LoggerOptions } from 'pino';
import { config } from './config';
import { commonOptions } from './sentry';

const serializers: LoggerOptions['serializers'] = {
  req({
    body,
    headers,
    method,
    originalUrl,
    query,
  }: Request<unknown, unknown, Record<string, unknown>>) {
    return {
      body: Object.keys(body).length ? body : undefined,
      headers: pick(headers, ['content-type', 'user-agent']),
      method,
      pathname: new URL(originalUrl, 'http://localhost').pathname,
      query: Object.keys(query).length ? query : undefined,
    };
  },

  res({ statusCode, responseTime }: Response) {
    return { statusCode, responseTime };
  },

  service(service) {
    // Hide "service" field when running locally, it saves some vertical spaces
    // in local logs.
    if (config.NODE_ENV === 'production') return service;
  },
};

const transportTargets: pino.TransportMultiOptions['targets'] = [
  {
    target: 'pino-sentry-transport',
    options: {
      sentry: {
        ...commonOptions,
      },
      context: ['module', 'req_id'],
      tags: ['deployId', 'invokingService'],
      withLogRecord: true,
      minLevel: pino.levels.values.error,
      expectPinoConfig: true,
    },
  },
];

export const rootLogger: Logger = getLogger('echo', { serializers, transportTargets }).child({
  env: config.NODE_ENV === 'production' ? config.ETHOS_ENV : undefined,
  deployId: config.NODE_ENV === 'production' ? config.DEPLOYMENT_ID : undefined,
});
