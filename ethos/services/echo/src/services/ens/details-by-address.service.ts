import { z } from 'zod';
import { getDetailsByAddress } from '../../common/net/ens.js';
import { Service } from '../service.base.js';
import { type AnyRecord } from '../service.types.js';
import { validators } from '../service.validator.js';

const schema = z.object({
  address: validators.address,
});

type Input = z.infer<typeof schema>;
type Output = Awaited<ReturnType<typeof getDetailsByAddress>>;

export class EnsDetailsByAddressService extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute({ address }: Input): Promise<Output> {
    const { avatar, name } = await getDetailsByAddress(address);

    return { avatar, name, address };
  }
}
