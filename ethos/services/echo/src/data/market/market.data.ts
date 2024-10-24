import { Prisma } from '@prisma/client';
import { type Address, getAddress } from 'viem';
import { prisma } from '../db';

const marketPriceHistoryData = Prisma.validator<Prisma.MarketUpdatedEventDefaultArgs>()({
  select: {
    positivePrice: true,
    negativePrice: true,
    createdAt: true,
  },
});
type MarketPriceHistoryItem = Prisma.MarketUpdatedEventGetPayload<typeof marketPriceHistoryData>;

export type PrismaMarketInfo = Prisma.MarketGetPayload<{
  include: {
    profile: false;
  };
}>;

export type PrismaMarketTransaction = Prisma.MarketVoteEventGetPayload<{
  include: {
    market: false;
    event: true;
  };
}>;

export type PrismaMarketPriceHistory = Prisma.MarketUpdatedEventGetPayload<{
  select: {
    positivePrice: true;
    negativePrice: true;
    createdAt: true;
  };
  include: {
    market: false;
  };
}>;

export type PrismaMarketCap = {
  trust: bigint;
  distrust: bigint;
};

export async function getMarketInfo(profileId: number): Promise<PrismaMarketInfo | null> {
  return await prisma.market.findUnique({
    where: {
      profileId,
    },
  });
}

export async function getAllMarkets(): Promise<PrismaMarketInfo[]> {
  return await prisma.market.findMany();
}

export async function getMarketPriceHistory(
  profileId: number,
  sinceTime: Date,
): Promise<MarketPriceHistoryItem[]> {
  return await prisma.marketUpdatedEvent.findMany({
    select: {
      positivePrice: true,
      negativePrice: true,
      createdAt: true,
    },
    where: {
      marketProfileId: profileId,
      createdAt: {
        gt: sinceTime,
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}

export async function getTransactions(profileId: number): Promise<PrismaMarketTransaction[]> {
  return await prisma.marketVoteEvent.findMany({
    where: {
      marketProfileId: profileId,
    },
    include: {
      event: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function getMarketHolders(
  profileId: number,
): Promise<Array<{ actorAddress: string; isPositive: boolean; total_amount: bigint }>> {
  const result = await prisma.$queryRaw<
    Array<{ actorAddress: string; isPositive: boolean; total_amount: bigint }>
  >`
    SELECT
      "actorAddress",
      "isPositive",
      SUM(
        CASE
          WHEN type = 'BUY' THEN amount
          WHEN type = 'SELL' THEN -amount
        END
      ) AS total_amount
    FROM
      market_vote_events
    WHERE
      "marketProfileId" = ${profileId}
    GROUP BY
      "actorAddress",
      "isPositive"
    HAVING
      SUM(
        CASE
          WHEN type = 'BUY' THEN amount
          WHEN type = 'SELL' THEN -amount
        END
      ) <> 0
    ORDER BY "isPositive" DESC, "total_amount" DESC
  `;

  return result;
}

export async function getMarketParticipants(profileId: number): Promise<Address[]> {
  const result = await prisma.marketVoteEvent.findMany({
    where: {
      marketProfileId: profileId,
    },
    select: {
      actorAddress: true,
    },
    distinct: ['actorAddress'],
  });

  return result.map((r) => getAddress(r.actorAddress));
}

export async function getMarketCap(profileId: number): Promise<PrismaMarketCap | null> {
  const marketInfo = await getMarketInfo(profileId);

  if (!marketInfo) {
    return null;
  }

  return {
    trust: BigInt(marketInfo.trustVotes) * BigInt(marketInfo.positivePrice),
    distrust: BigInt(marketInfo.distrustVotes) * BigInt(marketInfo.negativePrice),
  };
}
