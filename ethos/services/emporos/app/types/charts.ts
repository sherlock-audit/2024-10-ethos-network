export const chartWindowOptions = ['1D', '7D', '1M', '1Y'] as const;
export type ChartWindow = (typeof chartWindowOptions)[number];

export const timeBucketOptions = ['5 minutes', '30 minutes', '3 hours', '1 day', '1 week'] as const;
export type TimeBucket = (typeof timeBucketOptions)[number];

export type MarketPriceHistoryItem = {
  time: Date;
  trust: string;
  distrust: string;
};

export type MarketPriceHistory = {
  data: MarketPriceHistoryItem[];
  timeWindow: ChartWindow;
  bucket: TimeBucket;
};
