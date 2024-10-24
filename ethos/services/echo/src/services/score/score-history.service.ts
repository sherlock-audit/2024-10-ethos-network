import { fromUserKey } from '@ethos/domain';
import parse from 'parse-duration';
import { z } from 'zod';
import { getScoreHistory } from '../../data/score';
import {
  AttestationNotFoundError,
  getAttestationTarget,
} from '../../data/user/lookup/attestation-target';
import { Service } from '../service.base';
import { ServiceError } from '../service.error';
import { validators } from '../service.validator';

const scoreLookupSchema = z
  .object({
    userkey: validators.ethosUserKey(true),
    duration: z.string().transform((x, ctx) => {
      const ms = parse(x);

      if (ms === undefined || ms <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid duration format',
        });

        return z.NEVER;
      }

      const date = new Date(Date.now() - ms);

      return date;
    }),
  })
  .transform(({ duration, ...rest }) => ({ ...rest, afterDate: duration }));

type InputSchema = typeof scoreLookupSchema;
type Output = ScoreHistoryItem[];

type ScoreHistoryItem = { score: number; createdAt: Date };

export class ScoreHistoryService extends Service<InputSchema, Output> {
  validate(params: z.input<InputSchema>): z.infer<InputSchema> {
    return this.validator(params, scoreLookupSchema);
  }

  async execute({ userkey, afterDate }: z.infer<typeof scoreLookupSchema>): Promise<Output> {
    let target = fromUserKey(userkey, true);

    if ('service' in target && 'username' in target) {
      try {
        target = await getAttestationTarget(target);
      } catch (err) {
        if (!(err instanceof AttestationNotFoundError)) {
          this.logger.warn({ err }, 'Failed to get attestation target');
        }

        throw ServiceError.NotFound('Attestation account not found');
      }
    }

    const scoreHistory = await getScoreHistory(target, afterDate);

    return scoreHistory.map(({ score, createdAt }) => ({ score, createdAt }));
  }
}
