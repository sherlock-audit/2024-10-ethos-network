import { fromUserKey } from '@ethos/domain';
import { type PaginatedResponse } from '@ethos/helpers';
import parse from 'parse-duration';
import { z } from 'zod';
import { getDetailedScoreHistory, getScoreHistory } from '../../data/score/lookup.js';
import { type ScoreHistoryRecord } from '../../data/score/types.js';
import {
  AttestationNotFoundError,
  getAttestationTarget,
} from '../../data/user/lookup/attestation-target.js';
import { Service } from '../service.base.js';
import { ServiceError } from '../service.error.js';
import { validators } from '../service.validator.js';

const scoreLookupSchema = z
  .object({
    userkey: validators.ethosUserKey(true),
    expanded: z.coerce.boolean().default(false),
    duration: z.string().transform((x, ctx) => {
      const ms = parse(x);

      if (ms === undefined || ms <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid duration format',
        });

        return z.NEVER;
      }

      return new Date(Date.now() - ms);
    }),
  })
  .merge(validators.paginationSchema())
  .transform(({ duration, ...rest }) => ({ ...rest, afterDate: duration }));

type InputSchema = typeof scoreLookupSchema;
type Output = PaginatedResponse<ScoreHistoryRecord>;

export class ScoreHistoryService extends Service<InputSchema, Output> {
  validate(params: z.input<InputSchema>): z.infer<InputSchema> {
    return this.validator(params, scoreLookupSchema);
  }

  async execute({
    userkey,
    afterDate,
    expanded,
    pagination,
  }: z.infer<typeof scoreLookupSchema>): Promise<Output> {
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
    let scoreHistory: ScoreHistoryRecord[];

    if (expanded) {
      scoreHistory = await getDetailedScoreHistory(target, afterDate, pagination);
    } else {
      scoreHistory = await getScoreHistory(target, afterDate, pagination);
    }

    return {
      total: scoreHistory.length,
      limit: pagination.limit,
      offset: pagination.offset,
      values: scoreHistory,
    };
  }
}
