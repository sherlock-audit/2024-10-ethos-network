import { type Request, type Response } from 'express';
import { rootLogger } from '../common/logger.js';
import * as PostgresDb from '../data/db.js';
import { redis } from '../data/redis.js';
import * as TimescaleDb from '../data/timescale-db.js';

/**
 * Shallow health check route with no external dependencies so it responds as
 * fast as possible. This is useful for load balancers and other services that
 * need to know if the service is up.
 */
export function healthCheck(_req: Request, res: Response): void {
  res.json({ ok: true });
}

/**
 * Deep check route that checks the database and Redis connection. This is
 * useful for monitoring services that need to know if the service is fully up.
 * It should be called less often than the shallow health check route.
 */
export async function deepCheck(_req: Request, res: Response): Promise<void> {
  try {
    await Promise.all([
      PostgresDb.prisma.$queryRawUnsafe(PostgresDb.healthcheckQuery),
      TimescaleDb.prisma.$queryRawUnsafe(TimescaleDb.healthcheckQuery),
      redis.ping(),
    ]);

    res.json({ ok: true });
  } catch (err) {
    rootLogger.error({ err }, 'deepcheck.failed');

    res.status(500).json({ ok: false });
  }
}
