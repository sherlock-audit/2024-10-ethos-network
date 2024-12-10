import { type ContributionType, type Prisma } from '@prisma-pg/client';
import { addDays } from 'date-fns';
import { z } from 'zod';
import { prisma } from '../../data/db.js';
import { getTargetScoreXpMultiplier } from '../../data/score/xp.js';
import { Service } from '../service.base.js';
import { type AnyRecord } from '../service.types.js';
import { validators } from '../service.validator.js';

export const createSchema = z.object({
  profileId: validators.profileId,
  experience: z.number().positive(),
  actions: z
    .union([
      z.object({
        type: z.literal('REVIEW'),
        targetUserkeys: validators.ethosUserKey().array(),
      }),
      z.object({
        type: z.literal('TRUST_BATTLE'),
        targetUserkeys: validators.ethosUserKey().array(),
      }),
      z.object({
        type: z.literal('TRUST_CHECK'),
        targetUserkey: validators.ethosUserKey(),
      }),
      z.object({
        type: z.literal('REVIEW_CHECK'),
        reviewId: z.number().nonnegative(),
      }),
      z.object({
        type: z.literal('REVIEW_VOTE'),
        reviewId: z.number().nonnegative(),
      }),
      z.object({
        type: z.literal('SCORE_CHECK'),
        targetUserkey: validators.ethosUserKey(),
      }),
    ])
    .array(),
});

type Input = z.infer<typeof createSchema>;
type Output = { contributionBundleId: number };

export class ContributionCreateService extends Service<typeof createSchema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, createSchema);
  }

  async execute({ profileId, actions, experience }: Input): Promise<Output> {
    const contributionBundle = await prisma.contributionBundle.create({
      data: {
        profileId,
        expireAt: addDays(new Date(), 10),
      },
    });

    const pointsMultiplier = await getTargetScoreXpMultiplier({
      profileId,
    });

    for (const action of actions) {
      const actionCreateData = CONTRIBUTION_CREATE_DATA_MAP[action.type](action);

      await prisma.contribution.create({
        data: {
          contributionBundleId: contributionBundle.id,
          status: 'PENDING',
          experience: experience * pointsMultiplier,
          type: action.type,
          ...actionCreateData,
        },
      });
    }

    return { contributionBundleId: contributionBundle.id };
  }
}

export const CONTRIBUTION_CREATE_DATA_MAP: Record<
  ContributionType,
  (
    action: Input['actions'][number],
  ) => Omit<
    Prisma.ContributionUncheckedCreateInput,
    'type' | 'experience' | 'status' | 'profileId' | 'contributionBundleId'
  > // omit non-optional fields
> = {
  REVIEW: (action) => {
    if (action.type !== 'REVIEW') throw new Error('invalid contribution action');

    return {
      ContributionReview: { create: { targetUserkeys: action.targetUserkeys } },
    };
  },
  TRUST_BATTLE: (action) => {
    if (action.type !== 'TRUST_BATTLE') throw new Error('invalid contribution action');

    return {
      ContributionTrustBattle: {
        create: { targetUserkeys: action.targetUserkeys },
      },
    };
  },
  TRUST_CHECK: (action) => {
    if (action.type !== 'TRUST_CHECK') throw new Error('invalid contribution action');

    return {
      ContributionTrustCheck: { create: { targetUserkey: action.targetUserkey } },
    };
  },
  REVIEW_CHECK: (action) => {
    if (action.type !== 'REVIEW_CHECK') throw new Error('invalid contribution action');

    return { ContributionReviewCheck: { create: { reviewId: action.reviewId } } };
  },
  REVIEW_VOTE: (action) => {
    if (action.type !== 'REVIEW_VOTE') throw new Error('invalid contribution action');

    return { ContributionReviewVote: { create: { reviewId: action.reviewId } } };
  },
  SCORE_CHECK: (action) => {
    if (action.type !== 'SCORE_CHECK') throw new Error('invalid contribution action');

    return {
      ContributionScoreCheck: { create: { targetUserkey: action.targetUserkey } },
    };
  },
};
