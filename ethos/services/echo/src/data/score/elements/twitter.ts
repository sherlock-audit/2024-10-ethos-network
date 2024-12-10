import { X_SERVICE, type EthosUserTarget } from '@ethos/domain';
import { duration } from '@ethos/helpers';
import { prisma } from '../../db.js';
import { getAttestationTarget } from '../../user/lookup/attestation-target.js';
import { user } from '../../user/lookup/index.js';
import { type ScoreElementResult } from '../types.js';

/**
 * Calculates the maximum of ANY Twitter account associated with the given address.
 * Looks up the Ethos profile associated with this address, and for each twitter attestation,
 * retrieves the Twitter profile and calculates the age based on joined date.
 * @param address - The address associated with the Twitter account.
 * @returns A Promise that resolves to the max age of the Twitter account in days, or null
 */
export async function twitterAccountAge(target: EthosUserTarget): Promise<ScoreElementResult> {
  const NO_TWITTER_ACCOUNT = { score: -1, metadata: { noTwitterAccount: 1 } };
  const now = new Date();
  let oldest = now;
  const twitterAccounts: string[] = [];

  if ('service' in target) {
    if (target.service !== X_SERVICE) return NO_TWITTER_ACCOUNT;

    const attestationTarget = await getAttestationTarget(target);

    twitterAccounts.push(attestationTarget.account);
  } else {
    const profile = await user.getProfile(target);

    if (!profile) return NO_TWITTER_ACCOUNT;

    const attestations = await user.getAttestations(profile.id);

    for (const attestation of attestations) {
      if (attestation.service !== X_SERVICE) continue;
      twitterAccounts.push(attestation.account);
    }
  }

  const twitterProfiles = await prisma.twitterProfileCache.findMany({
    where: {
      id: { in: twitterAccounts },
    },
  });

  for (const profile of twitterProfiles) {
    if (profile.joinedAt) {
      const joinedDate = new Date(profile.joinedAt);

      if (joinedDate < oldest) {
        oldest = joinedDate;
      }
    }
  }

  if (oldest === now) return NO_TWITTER_ACCOUNT; // no twitter attestations

  const score = Math.floor((Date.now() - oldest.getTime()) / duration(1, 'day').toMilliseconds());

  return {
    score,
    metadata: { oldestAccount: oldest.getTime(), accountsChecked: twitterAccounts.length },
  };
}
