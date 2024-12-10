import { type PaginatedResponse, type PaginatedQuery, isValidAddress } from '@ethos/helpers';
import { Prisma } from '@prisma-pg/client';
import { type Address, getAddress } from 'viem';
import { prisma } from '../db.js';

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

export async function getMarketsByIds(ids: number[]): Promise<PrismaMarketInfo[]> {
  return await prisma.market.findMany({
    where: {
      profileId: { in: ids },
    },
  });
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

export async function getTransactions({
  profileId,
  voteTypeFilter,
  limit,
  offset,
  actorAddress,
}: {
  profileId?: number;
  voteTypeFilter: 'trust' | 'distrust' | 'all';
  actorAddress?: Address;
} & PaginatedQuery): Promise<PaginatedResponse<PrismaMarketTransaction>> {
  const where = {
    ...(profileId ? { marketProfileId: profileId } : {}),
    ...(isValidAddress(actorAddress) ? { actorAddress } : {}),
    ...(voteTypeFilter !== 'all' ? { isPositive: voteTypeFilter === 'trust' } : {}),
  };

  const [count, values] = await Promise.all([
    prisma.marketVoteEvent.count({ where }),
    prisma.marketVoteEvent.findMany({
      where,
      include: {
        event: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    }),
  ]);

  return {
    values,
    total: count,
    limit,
    offset,
  };
}

type GetMarketHoldersResult = Array<{
  actorAddress: string;
  isPositive: boolean;
  total_amount: bigint;
}>;

export async function getMarketHolders(profileId: number): Promise<GetMarketHoldersResult> {
  const result = await prisma.$queryRaw<GetMarketHoldersResult>`
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

function holdingsByAddressCTE(address: Address): Prisma.Sql {
  return Prisma.sql`
    WITH holdings AS (
      SELECT
        mve."actorAddress",
        CASE
          WHEN mve."isPositive" THEN 'trust'
        ELSE 'distrust'
      END as "voteType",
      mve."marketProfileId",
      SUM(
        CASE
          WHEN mve.type = 'BUY' THEN mve.amount
          WHEN mve.type = 'SELL' THEN -mve.amount
        END
      ) AS total_amount
    FROM
      market_vote_events mve
    WHERE
      mve."actorAddress" = ${address}
    GROUP BY
      mve."actorAddress",
      mve."isPositive",
      mve."marketProfileId"
    HAVING
      SUM(
        CASE
          WHEN mve.type = 'BUY' THEN mve.amount
          WHEN mve.type = 'SELL' THEN -mve.amount
        END
      ) <> 0
  )
`;
}

export type GetHoldingsByAddressResult = Array<{
  actorAddress: string;
  voteType: 'trust' | 'distrust';
  marketProfileId: number;
  totalAmount: bigint;
  trustPrice: string;
  distrustPrice: string;
}>;

export async function getHoldingsByAddress(
  address: Address,
  { limit, offset }: PaginatedQuery,
): Promise<GetHoldingsByAddressResult> {
  const result = await prisma.$queryRaw<GetHoldingsByAddressResult>`
    ${holdingsByAddressCTE(address)}
    SELECT
      h."actorAddress",
      h."voteType",
      h."marketProfileId",
      h.total_amount as "totalAmount",
      m."positivePrice" as "trustPrice",
      m."negativePrice" as "distrustPrice"
    FROM
      holdings h
    JOIN
      markets m ON h."marketProfileId" = m."profileId"
    ORDER BY h."voteType" DESC, h.total_amount DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  return result;
}

export type GetHoldingsTotalByAddressResult = { total_value: string | null };

export async function getHoldingsTotalByAddress(
  address: Address,
): Promise<GetHoldingsTotalByAddressResult> {
  const result = await prisma.$queryRaw<[GetHoldingsTotalByAddressResult]>`
    ${holdingsByAddressCTE(address)}
    SELECT
      SUM(
        CASE
          WHEN h."voteType" = 'trust' THEN h.total_amount * CAST(m."positivePrice" AS NUMERIC)
          ELSE h.total_amount * CAST(m."negativePrice" AS NUMERIC)
        END
      ) AS total_value
    FROM
      holdings h
    JOIN
      markets m ON h."marketProfileId" = m."profileId"
  `;

  return result[0];
}

export type GetTradingVolumeByAddressResult = {
  totalVolume: number;
};

export async function getTradingVolumeByAddress(
  address: Address,
): Promise<GetTradingVolumeByAddressResult> {
  const transactions = await prisma.marketVoteEvent.aggregate({
    where: {
      actorAddress: address,
    },
    _sum: {
      amount: true,
    },
  });

  return {
    totalVolume: transactions._sum.amount ?? 0,
  };
}
