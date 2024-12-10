import { type ActivityActor, type EthosUserTarget, X_SERVICE } from '@ethos/domain';
import { shortenHash } from '@ethos/helpers';
import { getAddress } from 'viem';
import { getActorsByTarget } from './echo.ts';
import { MarketUserData } from '~/data.server/market-user.ts';
import { type MarketUser } from '~/types/user.ts';
import { fallbackAvatarUrl } from '~/utils/avatar.utils.ts';

export async function getMarketUsersByAddresses(_addresses: string[]): Promise<MarketUser[]> {
  const uniqueAddresses = [...new Set(_addresses)];
  const marketUsersByAddress = await MarketUserData.getByAddresses(uniqueAddresses);
  const twitterTargets: EthosUserTarget[] = Object.values(marketUsersByAddress).flatMap((u) => ({
    service: X_SERVICE,
    account: u.twitterUserId,
  }));
  const addressTargets: EthosUserTarget[] = uniqueAddresses.map((address) => ({
    address: getAddress(address),
  }));
  // A market user is not guaranteed to have an Ethos Profile, so we need to
  // query both Twitter and Address targets.
  const allTargets = [...twitterTargets, ...addressTargets];

  const actors = await getActorsByTarget(allTargets);
  const actorsByAddress = new Map<string, ActivityActor>();
  const actorsByUsername: Record<string, ActivityActor> = {};

  for (const actor of actors) {
    if (actor.primaryAddress) {
      actorsByAddress.set(actor.primaryAddress, actor);
    }
    if (actor.username) {
      actorsByUsername[actor.username] = actor;
    }
  }

  const result = uniqueAddresses.map((address) => {
    if (marketUsersByAddress[address]) {
      // It's a market user, so we can show their twitter profile.
      const marketUser = marketUsersByAddress[address];
      const actor = marketUser.twitterUsername
        ? actorsByUsername[marketUser.twitterUsername]
        : actorsByAddress.get(address);

      return {
        address,
        avatarUrl: marketUser.avatarUrl ?? fallbackAvatarUrl(address),
        username: `@${marketUser.twitterUsername ?? 'UnknownUser'}`,
        name: marketUser.twitterName ?? shortenHash(address),
        createdDate: marketUser.createdAt,
        ethosInfo: {
          profileId: actor?.profileId,
          score: actor?.score ?? 0,
        },
      };
    }

    // It's not a markets user, so we'll show their ethos profile.
    const actor = actorsByAddress.get(address);

    return {
      address,
      avatarUrl: actor?.avatar ?? fallbackAvatarUrl(address),
      username: actor?.username ?? shortenHash(address),
      name: actor?.name ?? shortenHash(address),
      ethosInfo: {
        profileId: actor?.profileId,
        score: actor?.score ?? 0,
      },
    };
  });

  return result;
}

export async function searchMarketsUsers(query: string): Promise<MarketUser[]> {
  const users = await MarketUserData.search(query);

  const twitterTargets: EthosUserTarget[] = users.flatMap((u) => ({
    service: X_SERVICE,
    account: u.twitterUserId,
  }));
  const actors = await getActorsByTarget(twitterTargets);
  const actorsByUsername = actors.reduce<Record<string, ActivityActor>>((acc, actor) => {
    if (actor.username) {
      acc[actor.username] = actor;
    }

    return acc;
  }, {});

  return users.map((u) => {
    return {
      address: u.embeddedWallet,
      avatarUrl: u.avatarUrl ?? fallbackAvatarUrl(u.embeddedWallet),
      username: `@${u.twitterUsername ?? 'UnknownUser'}`,
      name: u.twitterName ?? shortenHash(u.embeddedWallet),
      createdDate: u.createdAt,
      ethosInfo: {
        profileId: actorsByUsername[u.twitterUsername ?? '']?.profileId,
        score: actorsByUsername[u.twitterUsername ?? '']?.score ?? 0,
      },
    };
  });
}

export async function getMarketUserByAddress(address: string): Promise<MarketUser | null> {
  const marketUsersByAddress = await getMarketUsersByAddresses([address]);

  return marketUsersByAddress[0];
}
