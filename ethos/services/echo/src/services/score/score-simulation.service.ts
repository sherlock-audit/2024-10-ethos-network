import { isTargetContract, type TargetContract } from '@ethos/contracts';
import { fromUserKey, type VoteInfo } from '@ethos/domain';
import { duration } from '@ethos/helpers';
import { maxVouchedEthDays, ScoreElementNames, type ElementName } from '@ethos/score';
import { z } from 'zod';
import { prisma } from '../../data/db.js';
import { getLatestScoreOrCalculate } from '../../data/score/calculate.js';
import {
  numVouchersImpact,
  reviewImpact,
  vouchedEthImpact,
  voteImpact,
} from '../../data/score/elements/ethos.js';
import { getScoreElements } from '../../data/score/lookup.js';
import { simulateNewScore } from '../../data/score/simulate.js';
import { type ScoreSimulationResult } from '../../data/score/types.js';
import { user } from '../../data/user/lookup/index.js';
import { scoreImpact } from '../invitations/invitation.service.js';
import { Service } from '../service.base.js';
import { ServiceError } from '../service.error.js';
import { type AnyRecord } from '../service.types.js';
import { validators } from '../service.validator.js';

const scoreLookupSchema = z.object({
  subjectKey: validators.ethosUserKey(),
  twitterProfileId: z.string().optional(),
  reviews: z
    .array(
      z.object({
        author: validators.address,
        score: z.enum(['negative', 'neutral', 'positive']),
      }),
    )
    .optional(),
  vouchAmount: z.coerce.number().positive().optional(),
  vouchedDays: z.coerce.number().positive().default(maxVouchedEthDays),
  numberOfVouchers: z.coerce.number().positive().optional(),
  votes: z
    .record(
      z.enum(['review', 'vouch']), // TargetContract types
      z.object({
        upvotes: z.number().int().nonnegative(),
        downvotes: z.number().int().nonnegative(),
      }),
    )
    .optional(),
});

type Input = z.infer<typeof scoreLookupSchema>;

export class ScoreSimulationService extends Service<
  typeof scoreLookupSchema,
  ScoreSimulationResult
> {
  validate(params: AnyRecord): Input {
    return this.validator(params, scoreLookupSchema);
  }

  async execute({
    subjectKey,
    twitterProfileId,
    reviews,
    vouchAmount,
    vouchedDays,
    numberOfVouchers,
    votes,
  }: Input): Promise<ScoreSimulationResult> {
    const profileId = await user.getProfileId(fromUserKey(subjectKey));
    const target = profileId ? { profileId } : fromUserKey(subjectKey);

    const subjectScore = await getLatestScoreOrCalculate(target);

    if (!subjectScore) {
      throw ServiceError.NotFound('Failed to calculate subject score');
    }

    const elements = await getScoreElements(subjectScore.id);
    const errors: string[] = [];

    if (elements) {
      Object.values(elements).forEach((element) => {
        if (element.error) {
          errors.push(element.element.name);
        }
      });
    }

    const simulatedInput: Record<ElementName, number> = {};

    const promises: Array<Promise<void>> = [];

    if (twitterProfileId) {
      const twitterPromise = prisma.twitterProfileCache
        .findUnique({
          where: {
            id: twitterProfileId,
          },
        })
        .then((twitterProfile) => {
          if (!twitterProfile?.joinedAt) {
            throw ServiceError.NotFound('Twitter Profile not found');
          }

          const twitterAge = Math.floor(
            (Date.now() - new Date(twitterProfile.joinedAt).getTime()) /
              duration(1, 'day').toMilliseconds(),
          );

          simulatedInput[ScoreElementNames.TWITTER_ACCOUNT_AGE] = twitterAge;
        });
      promises.push(twitterPromise);
    }

    if (reviews) {
      const createdAt = Date.now();
      const reviewsWithTimestamp = reviews.map((review) => ({ ...review, createdAt }));

      const reviewPromise = reviewImpact(target, reviewsWithTimestamp).then((reviewImpactScore) => {
        simulatedInput[ScoreElementNames.REVIEW_IMPACT] = reviewImpactScore.score;
      });

      promises.push(reviewPromise);
    }

    if (vouchAmount) {
      const vouchPromise = vouchedEthImpact(target, vouchAmount, vouchedDays).then(
        (vouchedImpactScore) => {
          simulatedInput[ScoreElementNames.VOUCHED_ETHEREUM_IMPACT] = vouchedImpactScore.score;
        },
      );
      promises.push(vouchPromise);
    }

    if (numberOfVouchers) {
      const vouchersPromise = numVouchersImpact(target, numberOfVouchers).then(
        (vouchersImpactScore) => {
          simulatedInput[ScoreElementNames.NUMBER_OF_VOUCHERS_IMPACT] = vouchersImpactScore.score;
        },
      );
      promises.push(vouchersPromise);
    }

    if (votes) {
      const provisionalVotes: Partial<Record<TargetContract, VoteInfo>> = {};
      Object.entries(votes).forEach(([key, value]) => {
        if (isTargetContract(key)) {
          provisionalVotes[key] = value;
        }
      });
      const votePromise = voteImpact(target, provisionalVotes).then((voteImpactScore) => {
        simulatedInput[ScoreElementNames.VOTE_IMPACT] = voteImpactScore.score;
      });
      promises.push(votePromise);
    }

    await Promise.all(promises);

    const newScore = await simulateNewScore(target, simulatedInput);

    return {
      simulation: scoreImpact(subjectScore.score, newScore.score),
      calculationResults: newScore,
      errors,
    };
  }
}
