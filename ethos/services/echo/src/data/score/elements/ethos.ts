import { type Prisma } from '.prisma/client';
import {
  NegativeReview,
  NeutralReview,
  PositiveReview,
  Score,
  type ScoreType,
} from '@ethos/blockchain-manager';
import { type EthosUserTarget } from '@ethos/domain';
import { formatEther } from 'viem';
import { getLatestScore } from '..';
import { convert } from '../../conversion';
import { prisma } from '../../db';
import { user } from '../../user/lookup';

const defaultScale = 400;
const defaultPace = 50;

/**
 * Normalizes values so that as x increases, the value continues to increase
 * towards, but never reaches, one.
 * There are many sigmoid functions; this is a relatively slow one. See
 * https://en.wikipedia.org/wiki/File:Gjl-t(x).svg
 * https://en.wikipedia.org/wiki/Sigmoid_function
 * Play with it yourself at
 * https://www.wolframalpha.com/input?i=x+%2F+%281+%2B+abs%28x%29+%2B+50%29*400+from+0+to+50
 * @param x The input value to be normalized.
 * @param scale The approx maximum the output should approach at high x values.
 * @param pace The speed at which the output approaches 1. Larger numbers are slower.
 * @returns A normalized value between -1 and 1.
 */
function sigmoid(x: number, scale: number = defaultScale, pace: number = defaultPace): number {
  return (x / (1 + Math.abs(x) + pace)) * scale;
}

// TODO all of these should source the sigmoid range from the score element definition
export async function reviewImpact(
  target: EthosUserTarget,
  provisionalReviews?: Record<ScoreType, number>,
): Promise<number> {
  const [positive, negative, neutral] = await Promise.all([
    getReviewCount(target, PositiveReview),
    getReviewCount(target, NegativeReview),
    getReviewCount(target, NeutralReview),
  ]);

  // Add provisional reviews to the current saved counts
  const totalPositive = positive + (provisionalReviews?.positive ?? 0);
  const totalNegative = negative + (provisionalReviews?.negative ?? 0);
  const totalNeutral = neutral + (provisionalReviews?.neutral ?? 0);

  // i dunno what adding neutral here will do but i wanted to try it
  const reviewPace = (defaultPace + totalNeutral) / 10;

  return sigmoid(totalPositive - totalNegative, defaultScale, reviewPace);
}

export async function vouchedEthImpact(
  target: EthosUserTarget,
  provisionalVouchedAmount?: number,
): Promise<number> {
  const amount = await getVouchedEth(target);

  return sigmoid(amount + (provisionalVouchedAmount ?? 0), defaultScale, 25);
}

export async function numVouchersImpact(
  target: EthosUserTarget,
  provisionalNumVouchers?: number,
): Promise<number> {
  const count = await getNumVouchers(target);

  return sigmoid(count + (provisionalNumVouchers ?? 0));
}

export async function ethosInvitation(target: EthosUserTarget): Promise<number> {
  const profile = await user.getProfile(target);
  const FACTOR = 0.2;

  if (!profile) return 0;

  const inviterScore = await getLatestScore(
    { profileId: profile.invitedBy },
    { allowDirty: true, asyncCalculate: true },
  );

  return inviterScore ? inviterScore.score * FACTOR : 0;
}

async function getReviewCount(target: EthosUserTarget, score: ScoreType): Promise<number> {
  const queryParams: Prisma.ReviewWhereInput = {
    archived: false,
    score: Score[score],
  };

  if ('address' in target) {
    queryParams.subject = target.address;
  } else if ('service' in target && 'account' in target) {
    queryParams.account = target.account;
    queryParams.service = target.service;
  } else if ('profileId' in target) {
    const primaryAddress = await user.getPrimaryAddress(target);

    if (!primaryAddress) return 0; // profile not found
    queryParams.subject = primaryAddress; // TODO handle multiple addresses per profile
  }

  return await prisma.review.count({ where: queryParams });
}

async function getVouchedEth(target: EthosUserTarget): Promise<number> {
  const profileId = await user.getProfileId(target);

  if (!profileId) return 0;

  const amount = await prisma.vouch.aggregate({
    _sum: {
      staked: true,
    },
    where: {
      subjectProfileId: profileId,
      archived: false,
    },
  });

  const staked = amount._sum.staked ? convert.toBigint(amount._sum.staked) : 0n;

  return Number(formatEther(staked));
}

async function getNumVouchers(target: EthosUserTarget): Promise<number> {
  const profileId = await user.getProfileId(target);

  if (!profileId) return 0;

  return await prisma.vouch.count({ where: { subjectProfileId: profileId, archived: false } });
}
