import { z } from 'zod';
import { type EnsDetailsLoose, getDetailsByName } from '../../common/net/ens.js';
import { Service } from '../service.base.js';
import { type AnyRecord } from '../service.types.js';

const schema = z.object({
  name: z.string(),
});

type Input = z.infer<typeof schema>;
type Output = EnsDetailsLoose;

export class EnsDetailsByNameService extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute({ name }: Input): Promise<Output> {
    const details = await getDetailsByName(name);

    if (!details) {
      return { avatar: null, name: null, address: null };
    }

    return details;
  }
}
