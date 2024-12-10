import { prismaPostgres } from '../data.server/postgres/db.ts';
import { prismaTimescale } from '../data.server/timescale/timescale-db.ts';

export async function loader() {
  try {
    await Promise.all([
      prismaPostgres.$queryRaw`SELECT 1+1`,
      prismaTimescale.$queryRaw`SELECT 1+1`,
    ]);

    return Response.json({ ok: true });
  } catch (err) {
    console.error({ err }, 'deepcheck.failed');

    return Response.json({ ok: false }, { status: 500 });
  }
}
