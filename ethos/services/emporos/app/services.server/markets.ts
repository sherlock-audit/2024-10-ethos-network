import { type MarketHoldingsByAddressRequest } from '@ethos/echo-client';
import { notEmpty } from '@ethos/helpers';
import { getMarketUsersByAddresses, searchMarketsUsers } from './users.ts';
import {
  getMarketsVolumes,
  getMarketVolume,
  getTopMoversSince,
  getTopVolumeSince,
} from '~/data.server/price-history.ts';
import {
  getAllMarkets,
  getEthExchangeRate,
  getHoldingsByAddress,
  getMarket,
  getMarketHolders,
  getMarketsByIds,
  searchMarkets as searchEchoMarkets,
} from '~/services.server/echo.ts';
import {
  type MarketHoldersInfo,
  type Market,
  type MarketVolume,
  type MarketWithStats,
} from '~/types/markets.ts';
import { type MarketUser } from '~/types/user.ts';

import { weiToUsd } from '~/utils/currency.utils.ts';

function convertToMarket(market: NonNullable<Awaited<ReturnType<typeof getMarket>>>): Market {
  return {
    profileId: market.marketProfileId,
    createdAt: market.createdAt,
    avatarUrl: market.profile.avatarUrl,
    ethosScore: market.profile.ethosScore,
    name: market.profile.name,
    address: market.profile.primaryAddress,
    trustPercentage: (market.trustVotes / (market.trustVotes + market.distrustVotes)) * 100,
  };
}

function convertToMarketWithStats(
  market: NonNullable<Awaited<ReturnType<typeof getMarket>>>,
  ethUsdRate: number,
  volume?: Awaited<ReturnType<typeof getMarketVolume>>,
): MarketWithStats {
  return {
    ...convertToMarket(market),
    stats: {
      totalVolumeUsd: weiToUsd(volume?.totalFunds ?? 0n, ethUsdRate),
      totalComments: 0,
      trustPercentage: (market.trustVotes / (market.trustVotes + market.distrustVotes)) * 100,
      trustVotes: market.trustVotes,
      distrustVotes: market.distrustVotes,
      trustPrice: BigInt(market.positivePrice),
      distrustPrice: BigInt(market.negativePrice),
      marketCap:
        BigInt(market.trustVotes) * BigInt(market.positivePrice) +
        BigInt(market.distrustVotes) * BigInt(market.negativePrice),
    },
  };
}

export async function getMarketInfoByProfileId(profileId: number): Promise<MarketWithStats | null> {
  const [m, volume, ethUsdRate] = await Promise.all([
    getMarket(profileId),
    getMarketVolume(profileId),
    getEthExchangeRate(),
  ]);

  if (!m) {
    return null;
  }

  return convertToMarketWithStats(m, ethUsdRate.price, volume);
}

export async function getMarketsByProfileIds(profileIds: number[]): Promise<Market[]> {
  const [markets, volumes, ethUsdRate] = await Promise.all([
    getMarketsByIds(profileIds),
    getMarketsVolumes(profileIds),
    getEthExchangeRate(),
  ]);

  const volumesById = volumes.reduce<Record<number, (typeof volumes)[number]>>((acc, volume) => {
    acc[volume.marketProfileId] = volume;

    return acc;
  }, {});

  return markets.map((m) =>
    convertToMarketWithStats(m, ethUsdRate.price, volumesById[m.marketProfileId]),
  );
}

export async function getMarketHoldersByType(
  profileId: number,
  type: 'all' | 'trust' | 'distrust',
) {
  const holders = await getMarketHolders(profileId);

  return holders[type];
}

export async function getMarketList(): Promise<MarketWithStats[]> {
  const markets = await getAllMarkets();
  const marketIds = markets.map((m) => m.marketProfileId);
  const [marketVolumes, ethUsdRate] = await Promise.all([
    getMarketsVolumes(marketIds),
    getEthExchangeRate(),
  ]);

  const marketVolumesById = marketVolumes.reduce<Record<number, (typeof marketVolumes)[number]>>(
    (acc, volume) => {
      acc[volume.marketProfileId] = volume;

      return acc;
    },
    {},
  );

  const result = markets
    .map((m) => {
      const marketVolume = marketVolumesById[m.marketProfileId];

      return convertToMarketWithStats(m, ethUsdRate.price, marketVolume);
    })
    .filter(notEmpty);

  return result;
}

export async function search(query: string) {
  const [markets, users] = await Promise.all([searchMarkets(query), searchMarketsUsers(query)]);

  return {
    markets,
    users,
  };
}

export async function searchMarkets(query: string): Promise<Market[]> {
  const markets = await searchEchoMarkets(query);

  return markets.map(convertToMarket);
}

export async function getTopVolume(since: Date, limit: number = 10): Promise<MarketVolume[]> {
  const [topVolume, ethUsdRate] = await Promise.all([
    getTopVolumeSince(since, limit),
    getEthExchangeRate(),
  ]);

  const markets = await getMarketsByIds(topVolume.map((t) => t.marketProfileId));

  const results = topVolume
    .map((t) => {
      const market = markets.find((m) => m?.marketProfileId === t.marketProfileId);

      if (!market) return null;

      return {
        market: convertToMarket(market),
        trustPercentage: (market.trustVotes / (market.trustVotes + market.distrustVotes)) * 100,
        volumeWei: t.totalVolumeWei,
        volumeUsd: weiToUsd(t.totalVolumeWei, ethUsdRate.price),
      };
    })
    .filter(notEmpty);

  return results;
}

export async function getTopVolumeMarkets(since: Date, limit: number = 10): Promise<Market[]> {
  const topVolume = await getTopVolumeSince(since, limit);

  const markets = await getMarketsByIds(topVolume.map((t) => t.marketProfileId));

  return markets.map(convertToMarket);
}

export async function getTopMovers(since: Date, limit: number = 10): Promise<Market[]> {
  const topMovers = await getTopMoversSince(since, limit);

  const markets = await Promise.all(
    topMovers.map(async (t) => await getMarketInfoByProfileId(t.marketProfileId)),
  );

  return markets.filter(notEmpty);
}

export async function getUserHoldingsByAddress(params: MarketHoldingsByAddressRequest) {
  const holdings = await getHoldingsByAddress(params);
  const markets = await getMarketsByIds([...new Set(holdings.map((h) => h.marketProfileId))]);

  const marketProfilesMap = markets.reduce<Record<number, (typeof markets)[number]>>(
    (acc, market) => {
      acc[market.marketProfileId] = market;

      return acc;
    },
    {},
  );

  return holdings.map((h) => ({
    ...h,
    market: marketProfilesMap[h.marketProfileId],
  }));
}

export async function getMarketHoldersInfo(
  marketId: number,
  type: 'all' | 'trust' | 'distrust',
): Promise<MarketHoldersInfo[]> {
  const holders = await getMarketHoldersByType(marketId, type);
  const users = await getMarketUsersByAddresses(holders.map((a) => a.actorAddress));

  const usersMap = users.reduce<Record<string, MarketUser>>((acc, user) => {
    acc[user.address] = user;

    return acc;
  }, {});

  return holders.slice(0, 12).map((h) => ({
    ...h,
    user: usersMap[h.actorAddress],
  }));
}
