import { type Review } from '@ethos/blockchain-manager';
import { type EthosUserTarget } from '@ethos/domain';
import { type Prisma } from '@prisma-pg/client';
import { convert } from './conversion.js';
import { prisma } from './db.js';
import { user } from './user/lookup/index.js';

/**
 * Retrieves all non-archived reviews for a given subject (user target)
 * @param target - The target user to fetch reviews for, can be an address, service account, or profile ID
 * @returns Promise resolving to an array of Review objects
 * @throws May throw if database queries fail
 */
export async function getReviewsBySubject(target: EthosUserTarget): Promise<Review[]> {
  const queryParams: Prisma.ReviewWhereInput = {
    archived: false,
  };

  if ('address' in target) {
    queryParams.subject = target.address;
  } else if ('service' in target && 'account' in target) {
    queryParams.account = target.account;
    queryParams.service = target.service;
  } else if ('profileId' in target) {
    const [profileAddresses, profileAttestations] = await Promise.all([
      // performance issue: subquery for addresses
      prisma.profileAddress.findMany({
        where: { profileId: target.profileId },
      }),
      // performance issue: subquery for attestations
      prisma.attestation.findMany({
        where: { profileId: target.profileId },
      }),
    ]);

    queryParams.OR = [
      // query by all addresses
      { subject: { in: profileAddresses.map((pa) => pa.address) } },
      // query by all attestation service/account pairs
      ...profileAttestations.map((attestation) => ({
        AND: {
          service: attestation.service,
          account: attestation.account,
        },
      })),
    ];
  }

  const reviews = await prisma.review.findMany({ where: queryParams });

  return reviews.map(convert.toReview);
}

/**
 * Retrieves all non-archived reviews written by a specific author (user target)
 * @param target - The target user whose authored reviews to fetch
 * @returns Promise resolving to an array of Review objects, or empty array if profile not found
 * @throws May throw if database queries fail
 */
export async function getReviewsByAuthor(target: EthosUserTarget): Promise<Review[]> {
  const profileId = await user.getProfileId(target);

  // only ethos profiles can author reviews
  if (!profileId) return [];

  const reviews = await prisma.review.findMany({
    where: {
      authorProfileId: profileId,
      archived: false,
    },
  });

  return reviews.map(convert.toReview);
}
