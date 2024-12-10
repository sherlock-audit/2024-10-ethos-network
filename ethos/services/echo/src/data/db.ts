import { type Prisma, PrismaClient } from '@prisma-pg/client';
import { config } from '../common/config.js';
import { metrics } from '../common/metrics.js';

const summary = metrics.makeSummary({
  name: 'db_query_time',
  help: 'Query time in milliseconds',
  labelNames: ['db', 'model', 'action'],
});

declare const globalThis: {
  prismaPgGlobal: PrismaClient;
} & typeof global;

export const prisma = globalThis.prismaPgGlobal ?? new PrismaClient();

/**
 * Dead code; debug utility
 *
 * Converts a Prisma SQL query object into a debuggable PostgreSQL statement.
 * The resulting SQL string can be executed directly in a PostgreSQL client.
 * This is particularly useful when debugging complex CTEs and the unified activities pagination.
 *
 * @param sql - A Prisma SQL query object containing the query template and values
 * @returns A PostgreSQL statement string that:
 *  1. Deallocates existing prepared statements
 *  2. Creates a new prepared statement with the query
 *  3. Executes the prepared statement with the provided values
 *
 * @example
 * const query = Prisma.sql`SELECT * FROM users WHERE name = ${userName}`;
 * console.log(debugSql(query));
 * // Output:
 * //   DEALLOCATE PREPARE ALL;
 * //   PREPARE temp as
 * //     SELECT * FROM users WHERE name = $1
 * //   ;
 * //   EXECUTE temp('John Doe');
 */
export function debugSql(sql: Prisma.Sql): string {
  return `
    DEALLOCATE PREPARE ALL;
    PREPARE temp as
      ${sql.text}
    ;
    EXECUTE temp(${sql.values
      .map((x) => {
        if (x === null) return 'null';
        if (typeof x === 'string') return `'${x as any}'`;

        return x;
      })
      .join(',')});
  `;
}

// Prevent hot reloading from creating new instances of PrismaClient in dev mode
// https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices#solution
if (config.NODE_ENV !== 'production') {
  globalThis.prismaPgGlobal = prisma;
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
        db: 'postgres',
        model: model ?? 'Unknown',
        action: params.action,
      })
      .observe(after - before);
  }

  return result;
});
