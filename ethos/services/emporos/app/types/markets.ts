import { type ProfileId } from '@ethos/blockchain-manager';
import { type echoClient } from '@ethos/echo-client';
import { type MarketUser } from './user.ts';

export type Market = {
  avatarUrl: string;
  ethosScore?: number;
  profileId: ProfileId;
  name: string | null;
  address: string;
  createdAt: Date;
  trustPercentage: number;
};

export type MarketWithStats = Market & {
  stats: MarketStats;
};

export type MarketStats = {
  totalVolumeUsd: number;
  totalComments: number;
  trustPercentage: number;
  trustVotes: number;
  distrustVotes: number;
  trustPrice: bigint;
  distrustPrice: bigint;
  marketCap: bigint;
};

export type MarketVolume = {
  market: Pick<Market, 'profileId' | 'name' | 'avatarUrl' | 'ethosScore'>;
  trustPercentage: number;
  volumeUsd: number;
};

type MarketHolder = Awaited<ReturnType<typeof echoClient.markets.holders>>['all'][number];

export type MarketHoldersInfo = MarketHolder & {
  user: MarketUser;
};
