import { fromUserKey, type ActivityActor } from '@ethos/domain';
import { z } from 'zod';
import { type AnyRecord } from '../service.types';
import { validators } from '../service.validator';
import { SharedActivity } from './shared.activity';

// TODO - use userkey until we replace it by profileId globally
const schema = z.object({
  userkeys: z.array(validators.ethosUserKey()),
});

type Input = z.infer<typeof schema>;

export class BulkActorsLookup extends SharedActivity<typeof schema, ActivityActor[]> {
  override validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute({ userkeys }: Input): Promise<ActivityActor[]> {
    const targets = userkeys.map((userkey) => fromUserKey(userkey));

    return await this.getActors(targets);
  }
}
