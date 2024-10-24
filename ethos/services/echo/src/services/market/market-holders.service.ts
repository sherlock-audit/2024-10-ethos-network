import { z } from 'zod';
import { MarketData } from '../../data/market';
import { Service } from '../service.base';
import { type AnyRecord } from '../service.types';

type MarketHolder = {
  actorAddress: string;
  marketId: number;
  voteType: 'trust' | 'distrust';
  total: bigint;
};

const schema = z.object({
  profileId: z.preprocess((v) => Number(v), z.number().positive(), {
    message: 'profileId must be a positive number',
  }),
});

type Input = z.infer<typeof schema>;
type Output = { trust: MarketHolder[]; distrust: MarketHolder[] };

export class MarketHoldersService extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute({ profileId }: Input): Promise<Output> {
    const holderData = await MarketData.getMarketHolders(profileId);
    const holders = holderData.map<MarketHolder>((holder) => ({
      actorAddress: holder.actorAddress,
      marketId: profileId,
      voteType: holder.isPositive ? 'trust' : 'distrust',
      total: holder.total_amount,
    }));

    return {
      trust: holders.filter((holder) => holder.voteType === 'trust'),
      distrust: holders.filter((holder) => holder.voteType === 'distrust'),
    };
  }
}
