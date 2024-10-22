import { type EthosUserTargetWithTwitterUsername } from '@ethos/domain';
import { notEmpty } from '@ethos/helpers';
import { TwitterScraper } from '../../../common/net/twitter/twitter-scraper.client';
import { prisma } from '../../db';
import { type PrismaTwitterProfileCache } from '../twitter-profile';

const twitterScraper = new TwitterScraper();

export class AttestationNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttestationNotFoundError';
  }
}

type AttestationTarget = Extract<EthosUserTargetWithTwitterUsername, { service: string }>;
type ValidAttestationTarget = Extract<
  EthosUserTargetWithTwitterUsername,
  { service: string; account: string }
>;

/**
 * Validates twitter user information against Ethos db, with twitter scraper as a fallback.
 *
 * This function handles different types of attestation targets:
 * - If the target already has an 'account' property that is a valid user ID, it's returned as-is.
 * - If the target has a 'username' or 'account' property that is not a user ID, it's treated as a Twitter username.
 * - For Twitter usernames, it fetches the corresponding profile to get the user ID.
 *
 * @param target - The attestation target to process. Can be various forms of user identification.
 * @returns A promise that resolves to a ValidAttestationTarget with a service and account (user ID).
 * @throws {Error} Throws an error if the Twitter profile is not found for a given username.
 * You should handle this error and throw the appropriate ServiceError, typically NotFound.
 */
export async function getAttestationTarget(
  target: AttestationTarget,
): Promise<ValidAttestationTarget> {
  if (!('service' in target)) {
    return target;
  }

  if ('account' in target) {
    const isUserId = Number.isInteger(Number(target.account));

    if (isUserId) {
      return target;
    }

    // TODO: if it's not an id, we should treat it as a username. This is a
    // temporary solution until we migrate Twitter Chrome extension to use new
    // userkey format. Once it's done, we should remove this check and if
    // "account" is in target, we should treat it as valid target.
  }

  const username = 'username' in target ? target.username : target.account;

  const profile = await twitterScraper.getProfile(username);

  if (!profile) {
    throw new AttestationNotFoundError('Twitter profile not found');
  }

  return {
    service: target.service,
    account: profile.id,
  };
}

export async function getAttestationTargetBulk(
  targets?: AttestationTarget[],
): Promise<ValidAttestationTarget[] | undefined> {
  const usernames = targets
    ?.map((x) => ('username' in x ? x.username : undefined))
    .filter(notEmpty);

  if (!usernames?.length) {
    return targets?.filter((x) => 'service' in x && 'account' in x);
  }

  const twitterProfiles = await prisma.twitterProfileCache.findMany({
    where: {
      username: { in: usernames, mode: 'insensitive' },
    },
  });

  const twitterMap = twitterProfiles.reduce<Map<string, PrismaTwitterProfileCache>>((acc, x) => {
    acc.set(x.username.toLowerCase(), x);

    return acc;
  }, new Map());

  return targets?.map((target) => {
    if ('username' in target) {
      const account = twitterMap.get(target.username.toLowerCase())?.id;

      if (!account) {
        throw new Error(`No account found for username: ${target.username}`);
      }

      return {
        service: target.service,
        account,
      };
    }

    return target;
  });
}
