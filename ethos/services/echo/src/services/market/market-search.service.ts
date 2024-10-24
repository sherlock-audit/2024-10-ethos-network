import { type Address } from 'viem';
import { z } from 'zod';
import { MarketData } from '../../data/market';
import { type PrismaMarketCap, type PrismaMarketInfo } from '../../data/market/market.data';
import { Service } from '../service.base';
import { type AnyRecord } from '../service.types';

const schema = z.object({
  query: z.string().optional(),
});

type Input = z.infer<typeof schema>;
type Output = Array<
  PrismaMarketInfo & {
    marketCap: PrismaMarketCap;
    participants: Address[];
  }
>;

export class MarketSearchService extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute({ query: _query }: Input): Promise<Output> {
    // TODO: Implement search when it's actually needed. For now, just return all markets.

    const allMarketInfo = await MarketData.getAllMarkets();

    const allMarkets = await Promise.all(
      allMarketInfo.map(async (marketInfo) => {
        const [marketCap, participants] = await Promise.all([
          MarketData.getMarketCap(marketInfo.profileId),
          MarketData.getMarketParticipants(marketInfo.profileId),
        ]);

        return {
          ...marketInfo,
          marketCap: marketCap ?? { trust: 0n, distrust: 0n },
          participants,
        };
      }),
    );

    return allMarkets;
  }
}
