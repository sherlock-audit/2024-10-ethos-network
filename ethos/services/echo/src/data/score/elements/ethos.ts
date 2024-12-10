import {
  NegativeReview,
  NeutralReview,
  PositiveReview,
  type ProfileId,
  type Review,
} from '@ethos/blockchain-manager';
import { isTargetContract, type TargetContract } from '@ethos/contracts';
import { type EthosUserTarget, type VoteInfo } from '@ethos/domain';
import { duration } from '@ethos/helpers';
import {
  bondingPeriod,
  DEFAULT_STARTING_SCORE,
  elementRange,
  getScoreElement,
  invitationScoreFactor,
  maxVouchedEthDays,
  mutualVouchMultiplier,
  ScoreElementNames,
} from '@ethos/score';
import { type Address } from 'viem';
import { prisma } from '../../db.js';
import { getReviewsByAuthor, getReviewsBySubject } from '../../review.js';
import { user } from '../../user/lookup/index.js';
import { getBulkVoteCounts } from '../../vote.js';
import { getNumVouchers, getVouchesByAuthor, getVouchedEthDays } from '../../vouch.js';
import { getLatestScore } from '../calculate.js';
import { getScoreAtDate } from '../lookup.js';
import { type ScoreMetadata, type ScoreElementResult } from '../types.js';

const defaultScale = 400;
const defaultPace = 50;
const fastPace = 25;

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

function mapToSigmoid(
  x: number,
  elementName: ScoreElementNames,
  pace: number = defaultPace,
): number {
  const element = getScoreElement(elementName);

  if (!element) throw new Error(`Unknown score element: ${elementName}`);

  const range = elementRange(element);

  // calculate below zero and above zero separately, as ranges are not guaranteed to be centered on zero
  if (x < 0) return sigmoid(x, 0 - range.min, pace);

  return sigmoid(x, range.max, pace);
}

type ReviewScoreImpact = Pick<Review, 'author' | 'score' | 'createdAt'>;

/**
 * Calculates the impact of reviews on a user's score, weighted by the reviewers' scores.
 *
 * The impact is calculated by:
 * 1. Getting all reviews for the target user
 * 2. For each reviewer, using their latest review only
 * 3. Weighting each review based on the reviewer's score relative to the subject's score
 * 4. Aggregating positive and negative reviews with their weights
 * 5. Applying a sigmoid function to normalize the final impact
 *
 * @param target - The user target to calculate review impact for (can be address, profile, or service account)
 * @param provisionalReviews - Optional array of hypothetical reviews to include in the calculation
 * @returns A normalized score impact value between -400 and 400 (based on default scale)
 *
 * @example
 * // Calculate review impact for a profile
 * const impact = await reviewImpact({ profileId: "123" });
 *
 * // Simulate review impact
 * const impact = await reviewImpact(
 *   { profileId: "123" },
 *   [{ authorProfileId: "456", score: 1, createdAt: new Date() }]
 * );
 */
export async function reviewImpact(
  target: EthosUserTarget,
  provisionalReviews?: ReviewScoreImpact[],
): Promise<ScoreElementResult> {
  const latestReviewCounts = {
    positive: 0,
    negative: 0,
    neutral: 0,
  };
  const coefficientSums = {
    positive: 0,
    negative: 0,
    neutral: 0,
  };
  let scoreSum = 0;
  let uniqueAuthorCount = 0;

  // get the subject (this user) score
  let subjectScore = (await getLatestScore(target))?.score;

  // if the subject doesn't have a score yet, use the default of 1000
  if (!subjectScore) subjectScore = DEFAULT_STARTING_SCORE;
  // for each review, pull author
  const subjectReviews: ReviewScoreImpact[] = await getReviewsBySubject(target);

  // calculate provisional reviews as real reviews if provided
  if (provisionalReviews) subjectReviews.push(...provisionalReviews);

  const authorScores = await getAuthorScores(subjectReviews);
  const uniqueAuthorReviews = latestReviewsByAuthor(subjectReviews);

  for (const review of uniqueAuthorReviews) {
    // get the score for the author
    let authorScore = authorScores[review.author];

    // if the author doesn't have a score yet, use the default of 1000
    if (!authorScore) authorScore = DEFAULT_STARTING_SCORE;

    // calculate a coefficient (author score / subject score) (ie, 800 / 1600 = 0.5)
    const coefficient = authorScore / subjectScore;
    // square the coefficient (ie, (800 / 1600) ^ 2 = 0.25)
    const squaredCoefficient = coefficient * coefficient;

    // add coefficient to count by positive/neutral/negative
    if (review.score === PositiveReview) coefficientSums.positive += squaredCoefficient;
    else if (review.score === NegativeReview) coefficientSums.negative += squaredCoefficient;
    else coefficientSums.neutral += squaredCoefficient;
    // collect metadata
    latestReviewCounts.positive += review.score === PositiveReview ? 1 : 0;
    latestReviewCounts.negative += review.score === NegativeReview ? 1 : 0;
    latestReviewCounts.neutral += review.score === NeutralReview ? 1 : 0;
    scoreSum += authorScore;
    uniqueAuthorCount += 1;
  }

  // neutral reviews do not count AGAINST positive reviews, but they do slow the pace
  // that is, it will take more positive reviews to reach max review impact if you have negative reviews
  const reviewPace = defaultPace + coefficientSums.neutral;

  const score = mapToSigmoid(
    coefficientSums.positive - coefficientSums.negative,
    ScoreElementNames.REVIEW_IMPACT,
    reviewPace,
  );
  const averageAuthorScore =
    uniqueAuthorCount > 0 ? Number((scoreSum / uniqueAuthorCount).toPrecision(4)) : 0;

  return {
    score,
    metadata: {
      positiveCoefficientSum: coefficientSums.positive,
      negativeCoefficientSum: coefficientSums.negative,
      neutralCoefficientSum: coefficientSums.neutral,
      positiveReviewCount: latestReviewCounts.positive,
      negativeReviewCount: latestReviewCounts.negative,
      neutralReviewCount: latestReviewCounts.neutral,
      averageAuthorScore,
    },
  };
}

async function getAuthorScores(
  subjectReviews: ReviewScoreImpact[],
): Promise<Record<string, number>> {
  const allAuthors = new Set(subjectReviews.map((r) => r.author));
  const authorScores: Record<string, number> = {};
  const authorScorePromises: Array<Promise<void>> = [];

  for (const author of allAuthors) {
    authorScorePromises.push(
      getLatestScore({ address: author }).then((result) => {
        if (result) authorScores[author] = result.score;
      }),
    );
  }

  await Promise.all(authorScorePromises);

  return authorScores;
}

function latestReviewsByAuthor(reviews: ReviewScoreImpact[]): ReviewScoreImpact[] {
  const latestReviewByAuthor: Record<Address, ReviewScoreImpact> = {};

  for (const review of reviews) {
    const existingReview = latestReviewByAuthor[review.author];

    if (!existingReview || review.createdAt > existingReview.createdAt) {
      latestReviewByAuthor[review.author] = review;
    }
  }

  return Object.values(latestReviewByAuthor);
}

/**
 * Calculates the impact of vouched ETH on a user's score.
 *
 * The impact is determined by the total ETH-days vouched for the user, including
 * any provisional/simulated amounts. The result is normalized using a sigmoid function.
 *
 * @param target - The user target to calculate vouched ETH impact for
 * @param provisionalVouchedAmount - Optional hypothetical amount of ETH to include
 * @param daysVouched - Number of days to calculate for provisional amount (default: maxVouchedEthDays)
 * @returns A normalized score impact value between -400 and 400 (based on default scale)
 */
export async function vouchedEthImpact(
  target: EthosUserTarget,
  provisionalVouchedAmount?: number,
  daysVouched: number = maxVouchedEthDays,
): Promise<ScoreElementResult> {
  const { stakedEthDays, vouches } = await getVouchedEthDays(target);

  // cap simulated days at maxVouchedEthDays
  const simulatedEthDays = provisionalVouchedAmount
    ? provisionalVouchedAmount * Math.min(daysVouched, maxVouchedEthDays)
    : 0;

  const score = mapToSigmoid(
    stakedEthDays + simulatedEthDays,
    ScoreElementNames.VOUCHED_ETHEREUM_IMPACT,
    fastPace,
  );

  return { score, metadata: { stakedEthDays, vouches } };
}

/**
 * Calculates the impact of the number of vouchers on a user's score.
 *
 * The impact is determined by the total count of unique vouchers for the user,
 * including any provisional/simulated vouchers. The result is normalized using a sigmoid function.
 *
 * @param target - The user target to calculate voucher count impact for
 * @param provisionalNumVouchers - Optional number of additional vouchers to include
 * @returns A normalized score impact value between -400 and 400 (based on default scale)
 */
export async function numVouchersImpact(
  target: EthosUserTarget,
  provisionalNumVouchers?: number,
): Promise<ScoreElementResult> {
  // TODO: this repeats getVouchedEthDays; we don't need to run it here and vouchedEthImpact
  // however, the refactor was taking me down a deeper rabbit hole than I wanted to go
  // and so I stopped here.
  const vouches = await getNumVouchers(target);

  const score = mapToSigmoid(
    vouches + (provisionalNumVouchers ?? 0),
    ScoreElementNames.NUMBER_OF_VOUCHERS_IMPACT,
    fastPace,
  );

  return { score, metadata: { vouches } };
}

/**
 * Calculates the impact of mutual vouches on a user's score.
 *
 * The impact is determined by the total ETH-days of mutual vouches (where both users
 * have vouched for each other), including any provisional/simulated mutual vouches. The result
 * is multiplied by the mutualVouchMultiplier and normalized using a sigmoid function.
 *
 * @param target - The user target to calculate mutual vouch impact for
 * @param provisionalMutualVouch - Optional hypothetical mutual vouch to include
 * @returns A normalized score impact value between -400 and 400 (based on default scale)
 */
export async function mutualVouchImpact(
  target: EthosUserTarget,
  provisionalMutualVouch?: ProvisionalMutualVouch,
): Promise<ScoreElementResult> {
  // TODO: this repeats getVouchedEthDays; we don't need to run it here and vouchedEthImpact
  // however, the refactor was taking me down a deeper rabbit hole than I wanted to go
  // and so I stopped here.
  let { mutualVouches, mutualStakedEthDays } = await getVouchedEthDays(target);

  if (provisionalMutualVouch)
    mutualStakedEthDays += await simulateMutualVouchEthDays(target, provisionalMutualVouch);

  const score = mapToSigmoid(
    mutualStakedEthDays * mutualVouchMultiplier,
    ScoreElementNames.MUTUAL_VOUCHER_BONUS,
    fastPace,
  );

  return { score, metadata: { mutualVouches, mutualStakedEthDays, mutualVouchMultiplier } };
}

/**
 * Simulates mutual vouch impact
 *
 * The target is assumed to be the subject of the mutual vouch.
 * This function checks if the provisional mutual vouch author has vouched the subject, simulating the subject vouching back.
 * If this creates a mutual vouch, it calculates the impact based on the amount and days vouched.
 *
 * @param target - The user target to calculate mutual vouch impact for.
 * @param provisionalMutualVouch - The provisional mutual vouch details including authorProfileId, amount, and optional daysVouched.
 * @returns The calculated impact as a number, or 0 if no mutual vouch exists.
 */
async function simulateMutualVouchEthDays(
  target: EthosUserTarget,
  provisionalMutualVouch: ProvisionalMutualVouch,
): Promise<number> {
  const { authorProfileId, amount, daysVouched } = provisionalMutualVouch;
  const subjectProfileId = await user.getProfileId(target);

  // subject is not an ethos user; can't vouch back.
  if (!subjectProfileId) return 0;

  const backVouch = await prisma.vouch.findFirst({
    where: {
      authorProfileId,
      subjectProfileId,
      archived: false,
    },
  });

  // does this subject vouch for the author? If not, it's not a mutual vouch.
  if (!backVouch) return 0;

  const days = daysVouched ?? maxVouchedEthDays;

  return amount * days;
}

type ProvisionalMutualVouch = {
  authorProfileId: ProfileId;
  amount: number;
  daysVouched?: number;
};

/**
 * Determines an impact to a user's score based on votes on their activities (reviews and vouches).
 *
 * The impact is calculated by:
 * 1. Getting all reviews and vouches authored by the target user
 * 2. Summing the net vote impact (upvotes - downvotes) for each activity
 * 3. Include simulated provisional votes if provided
 * 4. Applying a sigmoid function to normalize the final impact
 *
 * @param target - The user target to calculate vote impact for
 * @param provisionalVotes - Optional hypothetical votes to include in the calculation
 * @returns A normalized score impact value between -200 and 200
 *
 * @example
 * // Calculate vote impact for a profile
 * const impact = await voteImpact({ profileId: "123" });
 *
 * // Simulate with provisional votes
 * const impact = await voteImpact(
 *   { profileId: "123" },
 *   { review: { upvotes: 5, downvotes: 2 } }
 * );
 */
export async function voteImpact(
  target: EthosUserTarget,
  provisionalVotes?: Partial<Record<TargetContract, VoteInfo>>,
): Promise<ScoreElementResult> {
  const metadata: ScoreMetadata = {
    positiveReviewedActivities: 0,
    negativeReviewedActivities: 0,
    neutralReviewedActivities: 0,
    positiveVoteActivities: 0,
    negativeVoteActivities: 0,
    neutralVoteActivities: 0,
  };
  const [reviews, vouches] = await Promise.all([
    getReviewsByAuthor(target),
    getVouchesByAuthor(target),
  ]);

  const votes = await getBulkVoteCounts({
    review: reviews.map((r) => r.id),
    vouch: vouches.map((v) => v.id),
  });

  let netVoteImpact = 0;

  // Sum up votes from both reviews and vouches
  for (const voteType in votes) {
    if (!isTargetContract(voteType)) continue;

    const activities = votes[voteType];

    if (!activities) continue;

    for (const { voteInfo } of activities) {
      // increase by 1 if upvotes > downvotes,
      // decrease by 1 if downvotes > upvotes, zero if equal
      netVoteImpact += Math.sign(voteInfo.upvotes - voteInfo.downvotes);
      // collect metadata
      metadata.positiveVoteActivities += Math.sign(voteInfo.upvotes - voteInfo.downvotes);
      metadata.negativeVoteActivities += Math.sign(voteInfo.downvotes - voteInfo.upvotes);
      metadata.neutralVoteActivities += voteInfo.upvotes === voteInfo.downvotes ? 1 : 0;
    }
  }

  // Add provisional votes if provided
  if (provisionalVotes) {
    for (const voteType in provisionalVotes) {
      if (!isTargetContract(voteType)) continue;
      const voteInfo = provisionalVotes[voteType];

      if (!voteInfo) continue;

      netVoteImpact += Math.sign(voteInfo.upvotes - voteInfo.downvotes);
    }
  }

  const score = mapToSigmoid(netVoteImpact, ScoreElementNames.VOTE_IMPACT, defaultPace);

  return { score, metadata };
}

/**
 * Calculates the score impact based on who invited the user to the network.
 *
 * The impact is determined by the inviter's score at the time when the invited user's
 * bonding period ended. The calculation uses the following formula:
 * `(inviterScore - DEFAULT_STARTING_SCORE) * invitationScoreFactor`
 *
 * The maximum range is: [-200, 360]
 * Unlike other elements, the impact is not normalized via a sigmoid function.
 *
 * @param target - The user target to calculate invitation impact for
 * @returns A score impact value that can be positive or negative:
 *  - Positive when invited by a user with score > DEFAULT_STARTING_SCORE
 *  - Negative when invited by a user with score < DEFAULT_STARTING_SCORE
 *  - 0 if the user has no profile or wasn't invited
 *
 * @example
 * // Calculate invitation impact for a profile
 * const impact = await ethosInvitation({ profileId: "123" });
 *
 * // Example impacts based on inviter scores:
 * // Inviter score 1536 → impact = 107.2
 * // Inviter score 630  → impact = -74
 * // Inviter score 2699 → impact = 339.8
 * // Inviter score 2800 → impact = 360
 * // Inviter score 0    → impact = -200
 */
export async function ethosInvitation(target: EthosUserTarget): Promise<ScoreElementResult> {
  const profile = await user.getProfile(target);

  if (!profile) return { score: 0, metadata: {} };

  const bondingPeriodEndDate = new Date(
    duration(profile.createdAt, 'seconds').toMilliseconds() +
      duration(bondingPeriod, 'days').toMilliseconds(),
  );

  // Get the inviter's score at the time they invited this user + the bonding period
  const scoreData = await getScoreAtDate({ profileId: profile.invitedBy }, bondingPeriodEndDate);
  // if no score found, use default
  const inviterScore = scoreData?.score ?? DEFAULT_STARTING_SCORE;
  const invitationImpact = (inviterScore - DEFAULT_STARTING_SCORE) * invitationScoreFactor;

  return {
    score: invitationImpact,
    metadata: { inviterScore, bondingPeriodEndDate: bondingPeriodEndDate.getTime() },
  };
}
