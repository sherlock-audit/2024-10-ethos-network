import { fromUserKey } from '@ethos/domain';
import { type Address } from 'viem';
import { z } from 'zod';
import { user } from '../../data/user/lookup/index.js';
import { Service } from '../service.base.js';
import { type AnyRecord } from '../service.types.js';
import { validators } from '../service.validator.js';

const baseSchema = z.object({
  userkey: validators.ethosUserKey(),
});

const schema = baseSchema.merge(validators.paginationSchema({ maxLimit: 100 }));

type ProfileAddressesInput = z.infer<typeof schema>;

type Output = {
  profileId?: number;
  primaryAddress: Address;
  allAddresses: Address[];
};

export class ProfileAddressesService extends Service<typeof schema, Output> {
  validate(params: AnyRecord): ProfileAddressesInput {
    return this.validator(params, schema);
  }

  async execute({ userkey }: ProfileAddressesInput): Promise<Output> {
    const target = fromUserKey(userkey);

    return await user.getAddresses(target);
  }
}
