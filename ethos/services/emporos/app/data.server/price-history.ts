import { prismaTimescale } from './timescale/timescale-db.ts';
import { type TimeBucket, type ChartWindow } from '~/types/charts.ts';

export type MarketPriceHistoryData = {
  timeBucket: Date;
  medianTrustPrice?: string;
  medianDistrustPrice?: string;
};

const WINDOW_INTERVAL_MAP: Record<ChartWindow, string> = {
  '1D': '1 day',
  '7D': '7 days',
  '1M': '1 month',
  '1Y': '1 year',
};

async function getMarketPriceHistory(
  marketProfileId: number,
  bucket: TimeBucket,
  window: ChartWindow,
) {
  const interval = WINDOW_INTERVAL_MAP[window];
  const result = await prismaTimescale.$queryRawUnsafe<MarketPriceHistoryData[]>(`
    SELECT
      -- https://docs.timescale.com/api/latest/hyperfunctions/gapfilling/time_bucket_gapfill/
      time_bucket_gapfill('${bucket}', "createdAt") AS "timeBucket",
      -- Carry over the last observed value for empty buckets.
      locf(
        -- Use the last seen value in the bucket (e.g. the closing price)
        last("trustPrice", "createdAt"),
        (
          -- Get the last observed value prior to the current interval.
          SELECT COALESCE("trustPrice", 0) AS "trustPrice"
          FROM market_prices
          WHERE "createdAt" < NOW() - INTERVAL '${interval}'
          AND "marketProfileId" = ${marketProfileId}
          ORDER BY "createdAt" DESC
          LIMIT 1
        )
      ) AS "medianTrustPrice",
      locf(
        last("distrustPrice", "createdAt"),
        (
          SELECT COALESCE("distrustPrice", 0) AS "distrustPrice"
          FROM market_prices
          WHERE "createdAt" < NOW() - INTERVAL '${interval}'
          AND "marketProfileId" = ${marketProfileId}
          ORDER BY "createdAt" DESC
          LIMIT 1
        )
      ) AS "medianDistrustPrice"
    FROM
      market_prices
    WHERE
      "marketProfileId" = ${marketProfileId}
      AND "createdAt" >  NOW() - INTERVAL '${interval}'
      AND "createdAt" < NOW()
    GROUP BY
      "timeBucket"
    ORDER BY
      "timeBucket" ASC;
  `);

  return result.map((r) => ({
    timeBucket: r.timeBucket,
    medianTrustPrice: r.medianTrustPrice?.toString() ?? '0',
    medianDistrustPrice: r.medianDistrustPrice?.toString() ?? '0',
  }));
}

export async function getMarketVolume(marketProfileId: number, since?: Date) {
  const marketVolume = await prismaTimescale.marketVotes.aggregate({
    where: {
      marketProfileId,
      ...(since && {
        createdAt: {
          gte: since,
        },
      }),
    },
    _sum: {
      amount: true,
      funds: true,
    },
  });

  return {
    totalVolume: marketVolume._sum.amount ?? 0,
    totalFunds: BigInt(marketVolume._sum.funds?.toString() ?? '0'),
  };
}

export async function getMarketsVolumes(marketProfileIds: number[], since?: Date) {
  const marketVolumes = await prismaTimescale.marketVotes.groupBy({
    by: ['marketProfileId'],
    where: {
      marketProfileId: {
        in: marketProfileIds,
      },
      ...(since && {
        createdAt: {
          gte: since,
        },
      }),
    },
    _sum: {
      amount: true,
      funds: true,
    },
  });

  return marketVolumes.map((volume) => ({
    marketProfileId: volume.marketProfileId,
    totalVolume: volume._sum.amount ?? 0,
    totalFunds: BigInt(volume._sum.funds?.toString() ?? '0'),
  }));
}
export async function getTopMoversSince(since?: Date, limit: number = 10) {
  const results = await prismaTimescale.$queryRaw<
    Array<{
      marketProfileId: number;
      min_trust_price: string;
      max_trust_price: string;
      trust_price_diff: string;
    }>
  >`
  SELECT
    "marketProfileId",
    MIN("trustPrice") AS min_trust_price,
    MAX("trustPrice") AS max_trust_price,
    (MAX("trustPrice") - MIN("trustPrice")) AS trust_price_diff
  FROM
    market_prices
  WHERE
    "createdAt" >= COALESCE(${since}, '1970-01-01'::timestamp)
  GROUP BY
    "marketProfileId"
  ORDER BY
    trust_price_diff DESC
  LIMIT ${limit};
`;

  return results.map((record) => ({
    marketProfileId: record.marketProfileId,
    minTrustPrice: BigInt(record.min_trust_price),
    maxTrustPrice: BigInt(record.max_trust_price),
    trustPriceDiff: BigInt(record.trust_price_diff),
  }));
}

export async function getTopVolumeSince(since?: Date, limit: number = 10) {
  const topVolume = await prismaTimescale.marketVotes.groupBy({
    by: ['marketProfileId'],
    where: since
      ? {
          createdAt: {
            gte: since,
          },
        }
      : undefined,
    _sum: {
      funds: true,
    },
    orderBy: {
      _sum: {
        funds: 'desc',
      },
    },
    take: limit,
  });

  return topVolume.map((volume) => ({
    marketProfileId: volume.marketProfileId,
    totalVolumeWei: BigInt(volume._sum.funds?.toString() ?? '0'),
  }));
}

export const MarketHistoryData = {
  getMarketPriceHistory,
  getTopMoversSince,
  getTopVolumeSince,
};
