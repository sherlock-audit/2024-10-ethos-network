import { z } from 'zod';
import { MarketData } from '../../data/market/index.js';
import { type GetHoldingsByAddressResult } from '../../data/market/market.data.js';
import { Service } from '../service.base.js';
import { type AnyRecord } from '../service.types.js';
import { validators } from '../service.validator.js';

const schema = z
  .object({
    address: validators.address,
  })
  .merge(validators.paginationSchema());

type Input = z.infer<typeof schema>;
type Output = GetHoldingsByAddressResult;

export class HoldingsByAddressService extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute({ address, pagination }: Input): Promise<Output> {
    const holdings = await MarketData.getHoldingsByAddress(address, pagination);

    return holdings;
  }
}
