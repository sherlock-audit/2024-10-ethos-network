import { type MarketTransactionHistoryByAddressRequest } from '@ethos/echo-client';
import { notEmpty, type PaginatedQuery, type PaginatedResponse } from '@ethos/helpers';
import { getRecentActivity, getRecentActivityByAddress } from './echo.ts';
import { getMarketsByProfileIds } from './markets.ts';
import { getMarketUsersByAddresses } from './users.ts';
import { MarketHistoryData } from '~/data.server/price-history.ts';
import { type ProfileActivity, type MarketActivity } from '~/types/activity.ts';
import { type TimeBucket, type ChartWindow, type MarketPriceHistory } from '~/types/charts.ts';
import { type VoteTypeFilter } from '~/utils/getVoteTypeFilter.ts';

async function mapToMarketActivity(
  activity: Awaited<ReturnType<typeof getRecentActivity>>['values'],
) {
  const users = await getMarketUsersByAddresses(activity.map((a) => a.actorAddress));

  const usersMap = users.reduce<Record<string, (typeof users)[number]>>((acc, user) => {
    acc[user.address.toLowerCase()] = user;

    return acc;
  }, {});

  return activity
    .map((a) => {
      const user = usersMap[a.actorAddress.toLowerCase()];

      if (!user) {
        return null;
      }

      return {
        ...a,
        priceWei: BigInt(a.funds),
        user,
      };
    })
    .filter(notEmpty);
}

export async function getMarketActivity({
  marketProfileId,
  type = 'all',
  pagination,
}: {
  marketProfileId: number;
  type: VoteTypeFilter;
  pagination?: PaginatedQuery;
}): Promise<PaginatedResponse<MarketActivity>> {
  const activity = await getRecentActivity({
    profileId: marketProfileId,
    voteTypeFilter: type,
    ...pagination,
  });

  const marketActivity = await mapToMarketActivity(activity.values);

  return {
    ...activity,
    values: marketActivity,
  };
}

export async function getAllRecentActivity(
  type: VoteTypeFilter = 'all',
  pagination?: PaginatedQuery,
): Promise<PaginatedResponse<MarketActivity>> {
  const activity = await getRecentActivity({
    voteTypeFilter: type,
    pagination,
  });

  return {
    ...activity,
    values: await mapToMarketActivity(activity.values),
  };
}

export async function getMarketActivityByAddress(
  params: MarketTransactionHistoryByAddressRequest,
): Promise<PaginatedResponse<ProfileActivity>> {
  const activity = await getRecentActivityByAddress(params);

  const markets = await getMarketsByProfileIds([
    ...new Set(activity.values.map((a) => a.marketId)),
  ]);
  const marketProfilesMap = markets.reduce<Record<number, (typeof markets)[number]>>(
    (acc, market) => {
      acc[market.profileId] = market;

      return acc;
    },
    {},
  );

  return {
    ...activity,
    values: activity.values.map((a) => ({
      ...a,
      priceWei: BigInt(a.funds),
      market: marketProfilesMap[a.marketId],
    })),
  };
}

const TIME_WINDOW_BUCKETS: Record<ChartWindow, TimeBucket> = {
  '1D': '5 minutes',
  '7D': '30 minutes',
  '1M': '3 hours',
  '1Y': '1 day',
};

export async function getMarketPriceHistory(
  marketProfileId: number,
  timeWindow: ChartWindow,
): Promise<MarketPriceHistory> {
  const bucket = TIME_WINDOW_BUCKETS[timeWindow];
  const results = await MarketHistoryData.getMarketPriceHistory(
    marketProfileId,
    bucket,
    timeWindow,
  );

  const data = results.map((r) => ({
    time: r.timeBucket,
    trust: r.medianTrustPrice,
    distrust: r.medianDistrustPrice,
  }));

  return {
    data,
    timeWindow,
    bucket,
  };
}
