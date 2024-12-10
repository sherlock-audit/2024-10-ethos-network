import { z } from 'zod';
import { MarketData } from '../../data/market/index.js';
import { Service } from '../service.base.js';
import { type AnyRecord } from '../service.types.js';
import { validators } from '../service.validator.js';

const schema = z.object({
  address: validators.address,
});

type Input = z.infer<typeof schema>;
type Output = { totalValue: bigint };

export class HoldingsTotalByAddressService extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute({ address }: Input): Promise<Output> {
    const total = await MarketData.getHoldingsTotalByAddress(address);

    return { totalValue: BigInt(total.total_value ?? '0') };
  }
}
