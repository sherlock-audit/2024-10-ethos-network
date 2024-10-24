import { type ActivityActor, fromUserKey } from '@ethos/domain';
import { z } from 'zod';
import {
  AttestationNotFoundError,
  getAttestationTarget,
} from '../../data/user/lookup/attestation-target';
import { ServiceError } from '../service.error';
import { type AnyRecord } from '../service.types';
import { validators } from '../service.validator';
import { SharedActivity } from './shared.activity';

// TODO - use userkey until we replace it by profileId globally
const schema = z.object({
  userkey: validators.ethosUserKey(true),
});

type Input = z.infer<typeof schema>;

export class ActorLookup extends SharedActivity<typeof schema, ActivityActor> {
  override validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute({ userkey }: Input): Promise<ActivityActor> {
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

    return await this.getActor(target);
  }
}
