import { PrismaClient } from '@prisma/client';
import { config } from '../common/config';
import { metrics } from '../common/metrics';
import { getGlobalFeatureGate, FEATURE_GATES } from '../common/statsig';

const summary = metrics.makeSummary({
  name: 'db_query_time',
  help: 'Query time in milliseconds',
  labelNames: ['model', 'action'],
});

const viewRefreshCounter = metrics.makeCounter({
  name: 'db_view_refresh_counter',
  help: 'Counter of refreshes of materialized views',
  labelNames: ['view'],
});

export async function refreshView(name: 'targets' | 'names' | 'scores'): Promise<void> {
  if (getGlobalFeatureGate(FEATURE_GATES.UPDATE_MATERIALIZED_VIEW)) {
    await prisma.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${name}`);
    viewRefreshCounter.inc({ view: name });
  }
}

declare const globalThis: {
  prismaGlobal: PrismaClient;
} & typeof global;

export const prisma = globalThis.prismaGlobal ?? new PrismaClient();

// Prevent hot reloading from creating new instances of PrismaClient in dev mode
// https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices#solution
if (config.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

const skipQuery = 'SELECT 1 + 1';

// Middleware to log all queries
prisma.$use(async (params, next) => {
  const before = Date.now();

  const result = await next(params);

  const after = Date.now();

  if (params.args?.[0]?.[0] !== skipQuery) {
    const model = params.action === 'queryRaw' ? 'queryRaw' : params.model;

    summary
      .labels({
        model: model ?? 'Unknown',
        action: params.action,
      })
      .observe(after - before);
  }

  return result;
});
