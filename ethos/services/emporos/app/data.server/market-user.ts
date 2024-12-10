import { prismaPostgres, type PrismaPostgres } from './postgres/db.ts';

async function upsertMarketUser(user: PrismaPostgres.MarketUserCreateInput) {
  return await prismaPostgres.marketUser.upsert({
    where: { id: user.id },
    create: user,
    update: user,
  });
}

async function getMarketUsersByAddresses(addresses: string[]) {
  const users = await prismaPostgres.marketUser.findMany({
    select: {
      avatarUrl: true,
      id: true,
      embeddedWallet: true,
      twitterName: true,
      twitterUserId: true,
      twitterUsername: true,
      createdAt: true,
    },
    where: { embeddedWallet: { in: addresses } },
  });

  return users.reduce<Record<string, (typeof users)[number]>>((acc, user) => {
    if (user.embeddedWallet) {
      acc[user.embeddedWallet] = user;
    }

    return acc;
  }, {});
}

export async function getMarketUserById(userId: string) {
  return await prismaPostgres.marketUser.findUnique({
    where: {
      id: userId,
    },
  });
}

export async function searchMarketsUsers(query: string) {
  return await prismaPostgres.marketUser.findMany({
    where: { twitterUsername: { contains: query } },
  });
}

export const MarketUserData = {
  upsert: upsertMarketUser,
  getByAddresses: getMarketUsersByAddresses,
  getById: getMarketUserById,
  search: searchMarketsUsers,
};
