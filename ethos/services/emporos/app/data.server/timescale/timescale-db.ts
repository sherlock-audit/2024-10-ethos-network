import { PrismaClient, Prisma } from '@prisma-timescale/client';

import { singleton } from '../../utils/singleton.server.ts';

const prismaTimescale = singleton('prismaTimescale', () => new PrismaClient());

export { prismaTimescale, Prisma as PrismaTimescale };
