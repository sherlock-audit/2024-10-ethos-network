import { reviewContractName, type TargetContract } from '@ethos/contracts';
import { CONTRIBUTION_ANSWER_TYPES, fromUserKey } from '@ethos/domain';
import {
  ReviewEventType,
  VoteEventType,
  type ContributionType,
  type Prisma,
  XpPointsHistoryItemType,
  ContributionStatus,
} from '@prisma-pg/client';
import { isAfter, subHours } from 'date-fns';
import { z } from 'zod';
import { blockchainManager } from '../../common/blockchain-manager.js';
import { prisma } from '../../data/db.js';
import { getTargetScoreXpMultiplier } from '../../data/score/xp.js';
import { Service } from '../service.base.js';
import { ServiceError } from '../service.error.js';
import { type AnyRecord } from '../service.types.js';
import { validators } from '../service.validator.js';
import { type ContributionDefaultPayload, DEFAULT_INCLUDE } from './utils.js';

const contributionAnswerSchema = z.enum(CONTRIBUTION_ANSWER_TYPES);

const actionSchema = z.object({
  id: z.number().nonnegative(),
  action: z.union([
    z.object({
      type: z.literal('SKIP'),
    }),
    z.object({
      type: z.literal('REVIEW'),
      txHash: validators.transactionHash,
    }),
    z.object({
      type: z.literal('TRUST_BATTLE'),
      chosenIndex: z.number(),
    }),
    z.object({
      type: z.literal('TRUST_CHECK'),
      answer: contributionAnswerSchema,
    }),
    z.object({
      type: z.literal('REVIEW_CHECK'),
      answer: contributionAnswerSchema,
    }),
    z.object({
      type: z.literal('REVIEW_VOTE'),
      txHash: validators.transactionHash,
    }),
    z.object({
      type: z.literal('SCORE_CHECK'),
      answer: contributionAnswerSchema,
    }),
  ]),
});

type Input = z.infer<typeof actionSchema>;
type Output = undefined;

export class ContributionActionService extends Service<typeof actionSchema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, actionSchema);
  }

  async execute({ id, action }: Input): Promise<Output> {
    const contribution = await prisma.contribution.findUnique({
      where: {
        id,
      },
      include: DEFAULT_INCLUDE,
    });

    if (!contribution)
      throw ServiceError.NotFound('missing contribution', { code: 'MISSING_CONTRIBUTION' });

    if (contribution.status !== 'PENDING')
      throw ServiceError.BadRequest('contribution not pending', {
        code: 'CONTRIBUTION_NOT_PENDING',
      });

    if (isAfter(new Date(), contribution.ContributionBundle.expireAt))
      throw ServiceError.BadRequest('expired contribution bundle', {
        code: 'EXPIRED_CONTRIBUTION_BUNDLE',
      });

    // assert contibution bundle being completed in order
    const notCompletedCount = await prisma.contribution.count({
      where: {
        contributionBundleId: contribution.contributionBundleId,
        id: { lt: contribution.id },
        status: { not: 'COMPLETED' },
      },
    });

    if (notCompletedCount > 0)
      throw ServiceError.BadRequest('cannot complete contribution out of order', {
        code: 'INCORRECT_CONTRIBUTION_ORDER',
      });

    if (action.type === 'SKIP') {
      // skip contribution and all remaining contributions in bundle
      await skipRemainingContributions(contribution.contributionBundleId, contribution.id, 'gte');

      return;
    }

    if (contribution.type !== action.type)
      throw ServiceError.BadRequest('contribution type mismatch', {
        code: 'CONTRIBUTION_TYPE_MISMATCH',
      });

    const updateData = await CONTRIBUTION_UPDATE_DATA_MAP[action.type](action, contribution);

    const pointsMultiplier = await getTargetScoreXpMultiplier({
      profileId: contribution.ContributionBundle.profileId,
    });

    await prisma.$transaction([
      prisma.contribution.update({
        where: { id },
        data: {
          status: ContributionStatus.COMPLETED,
          ...updateData,
        },
        include: DEFAULT_INCLUDE,
      }),
      prisma.xpPointsHistory.create({
        data: {
          profileId: contribution.ContributionBundle.profileId,
          points: contribution.experience,
          type: XpPointsHistoryItemType.CONTRIBUTION,
          metadata: {
            id: contribution.id,
            type: 'contribution',
            subType: contribution.type,
            multiplier: pointsMultiplier,
          },
          createdAt: new Date(),
        },
      }),
    ]);
  }
}

async function skipRemainingContributions(
  contributionBundleId: number,
  contributionId: number,
  filter: 'gt' | 'gte',
): Promise<void> {
  // skip contribution and all remaining contributions in bundle
  await prisma.contribution.updateMany({
    where: {
      contributionBundleId,
      id: { [filter]: contributionId },
    },
    data: {
      status: 'SKIPPED',
    },
  });
}

const CONTRIBUTION_UPDATE_DATA_MAP: Record<
  ContributionType,
  (
    action: Input['action'],
    contribution: ContributionDefaultPayload,
  ) => Promise<Prisma.ContributionUpdateInput>
> = {
  REVIEW: async (action, contribution) => {
    if (action.type !== 'REVIEW') throw new Error('invalid action');

    if (!contribution.ContributionReview)
      throw ServiceError.NotFound('missing contribution review', {
        code: 'MISSING_CONTRIBUTION_REVIEW',
      });

    const reviewId = await findReviewId(
      action.txHash,
      contribution.ContributionReview.targetUserkeys,
      contribution.ContributionBundle.profileId,
    );

    return { ContributionReview: { update: { reviewId } } };
  },
  TRUST_BATTLE: async (action, contribution) => {
    if (action.type !== 'TRUST_BATTLE') throw new Error('invalid contribution action');

    if (!contribution.ContributionTrustBattle)
      throw ServiceError.NotFound('missing contribution trust battle', {
        code: 'MISSING_CONTRIBUTION_TRUST_BATTLE',
      });

    if (action.chosenIndex === -1) {
      await skipRemainingContributions(contribution.contributionBundleId, contribution.id, 'gt');
    } else if (
      action.chosenIndex < 0 ||
      action.chosenIndex >= contribution.ContributionTrustBattle.targetUserkeys.length
    ) {
      throw ServiceError.NotFound('invalid chosen index', {
        code: 'INVALID_CHOSEN_INDEX',
      });
    }

    return { ContributionTrustBattle: { update: { chosenIndex: action.chosenIndex } } };
  },
  TRUST_CHECK: async (action, contribution) => {
    if (action.type !== 'TRUST_CHECK') throw new Error('invalid contribution action');

    if (action.answer === 'UNSURE')
      await skipRemainingContributions(contribution.contributionBundleId, contribution.id, 'gt');

    return { ContributionTrustCheck: { update: { answer: action.answer } } };
  },
  REVIEW_CHECK: async (action, contribution) => {
    if (action.type !== 'REVIEW_CHECK') throw new Error('invalid contribution action');

    if (action.answer === 'UNSURE')
      await skipRemainingContributions(contribution.contributionBundleId, contribution.id, 'gt');

    return { ContributionReviewCheck: { update: { answer: action.answer } } };
  },
  REVIEW_VOTE: async (action, contribution) => {
    if (action.type !== 'REVIEW_VOTE') throw new Error('invalid contribution action');

    if (!contribution.ContributionReviewVote)
      throw ServiceError.NotFound('missing contribution review vote', {
        code: 'MISSING_CONTRIBUTION_REVIEW_VOTE',
      });

    const voteId = await findVoteId(
      action.txHash,
      reviewContractName,
      contribution.ContributionReviewVote.reviewId,
      contribution.ContributionBundle.profileId,
    );

    return { ContributionReviewVote: { update: { voteId } } };
  },
  SCORE_CHECK: async (action, contribution) => {
    if (action.type !== 'SCORE_CHECK') throw new Error('invalid contribution action');

    if (action.answer === 'UNSURE')
      await skipRemainingContributions(contribution.contributionBundleId, contribution.id, 'gt');

    return { ContributionScoreCheck: { update: { answer: action.answer } } };
  },
};

async function findReviewId(
  transactionHash: string,
  subjectUserkeys: string[],
  authorProfileId: number,
): Promise<number> {
  const review = await prisma.review.findFirst({
    where: {
      authorProfileId,
      // only allow reviews from at most 1 hour ago
      createdAt: { gt: subHours(new Date(), 1) },
      ReviewEvent: { some: { type: ReviewEventType.CREATE, event: { txHash: transactionHash } } },
    },
  });

  if (review === null)
    throw ServiceError.NotFound('could not find review', {
      code: 'MISSING_TRANSACTION_HASH',
    });

  let subjectMatch = false;
  const profileIds = [];

  for (const subject of subjectUserkeys) {
    const target = fromUserKey(subject);

    // TODO GDT check if a review targets a userkey sounds like something we've done before, check around to not duplicate code
    if ('address' in target && review.subject === target.address) subjectMatch = true;
    if (
      'service' in target &&
      'account' in target &&
      review.service === target.service &&
      review.account === target.account
    )
      subjectMatch = true;
    if ('profileId' in target) {
      profileIds.push(target.profileId);
    }
  }

  if (!subjectMatch) {
    const matchingProfileAddressCount = await prisma.profileAddress.count({
      where: { profileId: { in: profileIds }, address: review.subject },
    });

    if (matchingProfileAddressCount > 0) subjectMatch = true;
  }

  if (!subjectMatch)
    throw ServiceError.NotFound('review subject mismatch', {
      code: 'REVIEW_SUBJECT_MISMATCH',
    });

  return review.id;
}

async function findVoteId(
  transactionHash: string,
  targetContract: TargetContract,
  targetId: number,
  voterProfileId: number,
): Promise<number> {
  const vote = await prisma.vote.findFirst({
    where: {
      targetContract: blockchainManager.contractLookup[targetContract].address,
      targetId,
      voter: voterProfileId,
      // only allow votes from at most 1 hour ago
      updatedAt: { gt: subHours(new Date(), 1) },
      VoteEvent: {
        some: {
          type: { in: [VoteEventType.CREATE, VoteEventType.UPDATE] },
          event: { txHash: transactionHash },
        },
      },
    },
  });

  if (vote === null)
    throw ServiceError.NotFound('could not find vote', {
      code: 'MISSING_TRANSACTION_HASH',
    });

  return vote.id;
}
