import { type ActivityActor } from '@ethos/domain';
import { webUrlMap } from '@ethos/env';
import { shortenHash } from '@ethos/helpers';
import { config } from '../../common/config.js';
import { type PrismaMarketInfo } from '../../data/market/market.data.js';

/**
 * @description A reputation market with the Ethos Profile information.
 */
export type MarketProfile = {
  marketProfileId: number;
  creatorAddress: string;
  positivePrice: string;
  negativePrice: string;
  trustVotes: number;
  distrustVotes: number;
  createdAt: Date;
  updatedAt: Date;
  profile: {
    primaryAddress: string;
    avatarUrl: string;
    ethosScore: number;
    name: string;
  };
};

export function convertToMarketProfile(
  market: PrismaMarketInfo,
  actor: ActivityActor,
): MarketProfile {
  return {
    marketProfileId: market.profileId,
    creatorAddress: actor.primaryAddress,
    positivePrice: market.positivePrice,
    negativePrice: market.negativePrice,
    trustVotes: market.trustVotes,
    distrustVotes: market.distrustVotes,
    createdAt: market.createdAt,
    updatedAt: market.updatedAt,
    profile: {
      primaryAddress: actor.primaryAddress,
      avatarUrl: actor.avatar ?? fallbackAvatarUrl(actor.userkey),
      ethosScore: actor.score,
      name: actor.name ?? actor.username ?? shortenHash(actor.primaryAddress),
    },
  };
}

function fallbackAvatarUrl(userkey: string): string {
  return new URL(`/avatar/blockie/${userkey}`, webUrlMap[config.ETHOS_ENV]).toString();
}
