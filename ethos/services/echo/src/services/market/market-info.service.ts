import { type Address } from 'viem';
import { z } from 'zod';
import { MarketData } from '../../data/market';
import { type PrismaMarketCap, type PrismaMarketInfo } from '../../data/market/market.data';
import { Service } from '../service.base';
import { ServiceError } from '../service.error';
import { type AnyRecord } from '../service.types';

const schema = z.object({
  profileId: z.preprocess((v) => Number(v), z.number().positive(), {
    message: 'profileId must be a positive number',
  }),
});

type Input = z.infer<typeof schema>;
type Output = PrismaMarketInfo & {
  marketCap: PrismaMarketCap;
  participants: Address[];
};

export class MarketInfoService extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute({ profileId }: Input): Promise<Output> {
    const [marketInfo, marketCap, participants] = await Promise.all([
      MarketData.getMarketInfo(profileId),
      MarketData.getMarketCap(profileId),
      MarketData.getMarketParticipants(profileId),
    ]);

    if (!marketInfo) {
      throw ServiceError.NotFound(`No market for ${profileId}`);
    }

    return { ...marketInfo, marketCap: marketCap ?? { trust: 0n, distrust: 0n }, participants };
  }
}
