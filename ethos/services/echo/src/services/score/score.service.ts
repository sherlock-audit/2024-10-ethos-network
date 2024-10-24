import { fromUserKey } from '@ethos/domain';
import { JsonHelper } from '@ethos/helpers';
import { z } from 'zod';
import { type ScoreCalculationResults, getLatestScoreOrCalculate } from '../../data/score';
import {
  AttestationNotFoundError,
  getAttestationTarget,
} from '../../data/user/lookup/attestation-target';
import { Service } from '../service.base';
import { ServiceError } from '../service.error';
import { type AnyRecord } from '../service.types';
import { validators } from '../service.validator';

const scoreLookupSchema = z.object({
  userkey: validators.ethosUserKey(true),
});
type Input = z.infer<typeof scoreLookupSchema>;

export class ScoreService extends Service<typeof scoreLookupSchema, ScoreCalculationResults> {
  validate(params: AnyRecord): Input {
    return this.validator(params, scoreLookupSchema);
  }

  async execute({ userkey }: Input): Promise<ScoreCalculationResults> {
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

    const latest = await getLatestScoreOrCalculate(target);
    const elements =
      JsonHelper.parseSafe<ScoreCalculationResults['elements']>(
        typeof latest.elements === 'string' ? latest.elements : JSON.stringify(latest.elements),
      ) ?? {};

    return {
      score: latest.score,
      elements,
      errors: latest.errors,
    };
  }
}
