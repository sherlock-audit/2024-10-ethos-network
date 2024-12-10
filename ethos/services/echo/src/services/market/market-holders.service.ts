import { z } from 'zod';
import { MarketData } from '../../data/market/index.js';
import { Service } from '../service.base.js';
import { type AnyRecord } from '../service.types.js';
import { validators } from '../service.validator.js';

const schema = z.object({
  profileId: validators.profileId,
});

type MarketHolder = {
  actorAddress: string;
  marketId: number;
  voteType: 'trust' | 'distrust';
  total: bigint;
};
type Input = z.infer<typeof schema>;
type Output = { all: MarketHolder[]; trust: MarketHolder[]; distrust: MarketHolder[] };

export class MarketHoldersService extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute({ profileId }: Input): Promise<Output> {
    const holderData = await MarketData.getMarketHolders(profileId);
    const holders = holderData.map<MarketHolder>((holder) => ({
      ...holder,
      marketId: profileId,
      voteType: holder.isPositive ? 'trust' : 'distrust',
      total: BigInt(holder.total_amount),
    }));

    return {
      all: holders,
      trust: holders.filter((holder) => holder.voteType === 'trust'),
      distrust: holders.filter((holder) => holder.voteType === 'distrust'),
    };
  }
}
