import { PrismaClient, Prisma } from '@prisma-emporos/client';
import { singleton } from '~/utils/singleton.server.ts';

const prismaPostgres = singleton('prismaPostgres', () => new PrismaClient());

export { prismaPostgres, Prisma as PrismaPostgres };
