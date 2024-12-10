import { fromUserKey } from '@ethos/domain';
import { z } from 'zod';
import { getLatestScoreOrCalculate } from '../../data/score/calculate.js';
import { getScoreByTxHash, getScoreElements } from '../../data/score/lookup.js';
import { type ScoreCalculationResults, type ScoreMetadata } from '../../data/score/types.js';
import {
  AttestationNotFoundError,
  getAttestationTarget,
} from '../../data/user/lookup/attestation-target.js';
import { Service } from '../service.base.js';
import { ServiceError } from '../service.error.js';
import { type AnyRecord } from '../service.types.js';
import { validators } from '../service.validator.js';

const scoreLookupSchema = z.object({
  userkey: validators.ethosUserKey(true),
  txHash: validators.transactionHash.optional(),
});
type Input = z.infer<typeof scoreLookupSchema>;

export class ScoreService extends Service<typeof scoreLookupSchema, ScoreCalculationResults> {
  validate(params: AnyRecord): Input {
    return this.validator(params, scoreLookupSchema);
  }

  private async formatScoreResult(score: {
    id: number;
    score: number;
  }): Promise<ScoreCalculationResults> {
    const elements = await getScoreElements(score.id);
    const errors: string[] = [];

    if (elements) {
      Object.values(elements).forEach((element) => {
        if (element.error) {
          errors.push(element.element.name);
        }
      });
    }

    return {
      score: score.score,
      elements: elements ?? {},
      metadata: (elements?.metadata ?? {}) as Record<string, ScoreMetadata>,
      errors,
    };
  }

  async execute({ userkey, txHash }: Input): Promise<ScoreCalculationResults> {
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

    if (txHash) {
      const score = await getScoreByTxHash(target, txHash);

      if (!score) {
        throw ServiceError.NotFound('Score for transaction not found');
      }

      return await this.formatScoreResult(score);
    }

    const latest = await getLatestScoreOrCalculate(target);

    if (!latest) {
      throw ServiceError.NotFound('Score not found');
    }

    return await this.formatScoreResult(latest);
  }
}
