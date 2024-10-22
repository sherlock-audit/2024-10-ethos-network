import { type Request, type Response } from 'express';
import { rootLogger } from '../common/logger';
import { prisma } from '../data/db';
import { redis } from '../data/redis';

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
export function deepCheck(_req: Request, res: Response): void {
  Promise.all([prisma.$queryRaw`SELECT 1+1`, redis.ping()])
    .then(() => {
      res.json({ ok: true });
    })
    .catch((err) => {
      rootLogger.error({ err }, 'deepcheck.failed');

      res.status(500).json({ ok: false });
    });
}
