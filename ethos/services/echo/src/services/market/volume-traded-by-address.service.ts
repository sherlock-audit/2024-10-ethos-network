import { z } from 'zod';
import {
  getTradingVolumeByAddress,
  type GetTradingVolumeByAddressResult,
} from '../../data/market/market.data.js';
import { Service } from '../service.base.js';
import { type AnyRecord } from '../service.types.js';
import { validators } from '../service.validator.js';

const schema = z.object({
  address: validators.address,
});

type Input = z.infer<typeof schema>;
type Output = GetTradingVolumeByAddressResult;

export class VolumeTradedByAddressService extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute(params: Input): Promise<Output> {
    return await getTradingVolumeByAddress(params.address);
  }
}
