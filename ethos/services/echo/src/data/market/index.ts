import {
  getMarketInfo,
  getMarketParticipants,
  getMarketCap,
  type PrismaMarketInfo,
  type PrismaMarketCap,
  getMarketPriceHistory,
  getTransactions,
  getMarketHolders,
  getAllMarkets,
} from './market.data';

export const MarketData = {
  getMarketInfo,
  getMarketParticipants,
  getMarketCap,
  getMarketPriceHistory,
  getTransactions,
  getMarketHolders,
  getAllMarkets,
};

export type { PrismaMarketInfo, PrismaMarketCap };
