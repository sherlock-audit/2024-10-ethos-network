import { fromUserKey } from '@ethos/domain';
import { duration } from '@ethos/helpers';
import { ScoreElementNames, type ElementName } from '@ethos/score';
import { z } from 'zod';
import { prisma } from '../../data/db';
import {
  getLatestScoreOrCalculate,
  type ScoreSimulationResult,
  simulateNewScore,
} from '../../data/score';
import { numVouchersImpact, reviewImpact, vouchedEthImpact } from '../../data/score/elements/ethos';
import { scoreImpact } from '../invitations/invitation.service';
import { Service } from '../service.base';
import { ServiceError } from '../service.error';
import { type AnyRecord } from '../service.types';
import { validators } from '../service.validator';

const scoreLookupSchema = z.object({
  subjectKey: validators.ethosUserKey(),
  twitterProfileId: z.string().optional(),
  positiveReviews: z.coerce.number().optional(),
  negativeReviews: z.coerce.number().optional(),
  neutralReviews: z.coerce.number().optional(),
  vouchAmount: z.coerce.number().positive().optional(),
  numberOfVouchers: z.coerce.number().positive().optional(),
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
    positiveReviews,
    negativeReviews,
    neutralReviews,
    vouchAmount,
    numberOfVouchers,
  }: Input): Promise<ScoreSimulationResult> {
    const target = fromUserKey(subjectKey);
    const subjectScore = await getLatestScoreOrCalculate(target);

    if (!subjectScore) {
      throw ServiceError.NotFound('Failed to calculate subject score');
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

    if ([positiveReviews, negativeReviews, neutralReviews].some((v) => v !== undefined)) {
      const reviewPromise = reviewImpact(target, {
        positive: positiveReviews ?? 0,
        negative: negativeReviews ?? 0,
        neutral: neutralReviews ?? 0,
      }).then((reviewImpactScore) => {
        simulatedInput[ScoreElementNames.REVIEW_IMPACT] = reviewImpactScore;
      });

      promises.push(reviewPromise);
    }

    if (vouchAmount) {
      const vouchPromise = vouchedEthImpact(target, vouchAmount).then((vouchedImpactScore) => {
        simulatedInput[ScoreElementNames.VOUCHED_ETHEREUM_IMPACT] = vouchedImpactScore;
      });
      promises.push(vouchPromise);
    }

    if (numberOfVouchers) {
      const vouchersPromise = numVouchersImpact(target, numberOfVouchers).then(
        (vouchersImpactScore) => {
          simulatedInput[ScoreElementNames.NUMBER_OF_VOUCHERS_IMPACT] = vouchersImpactScore;
        },
      );
      promises.push(vouchersPromise);
    }

    await Promise.all(promises);

    const newScore = await simulateNewScore(fromUserKey(subjectKey), simulatedInput);

    return {
      simulation: scoreImpact(subjectScore.score, newScore.score),
      calculationResults: newScore,
      errors: subjectScore.errors,
    };
  }
}
