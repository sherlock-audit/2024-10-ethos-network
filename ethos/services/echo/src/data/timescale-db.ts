import { PrismaClient } from '@prisma-timescale/client';
import { config } from '../common/config.js';
import { metrics } from '../common/metrics.js';

const summary = metrics.makeSummary({
  name: 'timescale_query_time',
  help: 'Query time in milliseconds',
  labelNames: ['db', 'model', 'action'],
});

declare const globalThis: {
  prismaTimescaleGlobal: PrismaClient;
} & typeof global;

export const prisma = globalThis.prismaTimescaleGlobal ?? new PrismaClient();

// Prevent hot reloading from creating new instances of PrismaClient in dev mode
// https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices#solution
if (config.NODE_ENV !== 'production') {
  globalThis.prismaTimescaleGlobal = prisma;
}

export const healthcheckQuery = 'SELECT 1+1';

// Middleware to log all queries
prisma.$use(async (params, next) => {
  const before = Date.now();

  const result = await next(params);

  const after = Date.now();

  if (params.args?.[0]?.[0] !== healthcheckQuery) {
    const model = params.action === 'queryRaw' ? 'queryRaw' : params.model;

    summary
      .labels({
        db: 'timescale',
        model: model ?? 'Unknown',
        action: params.action,
      })
      .observe(after - before);
  }

  return result;
});
