import { fromUserKey, type ActivityActor } from '@ethos/domain';
import { z } from 'zod';
import { Service } from '../service.base.js';
import { type AnyRecord } from '../service.types.js';
import { validators } from '../service.validator.js';
import { getActors } from './utility.js';

// TODO - use userkey until we replace it by profileId globally
const schema = z.object({
  userkeys: z.array(validators.ethosUserKey()),
});

type Input = z.infer<typeof schema>;

export class BulkActorsLookup extends Service<typeof schema, ActivityActor[]> {
  override validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute({ userkeys }: Input): Promise<ActivityActor[]> {
    const targets = userkeys.map((userkey) => fromUserKey(userkey));

    return await getActors(targets);
  }
}
