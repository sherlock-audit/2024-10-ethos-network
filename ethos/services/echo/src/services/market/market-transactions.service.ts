import { z } from 'zod';
import { MarketData } from '../../data/market';
import { type PrismaMarketTransaction } from '../../data/market/market.data';
import { Service } from '../service.base';
import { type AnyRecord } from '../service.types';

type MarketTransaction = {
  eventId: number;
  type: PrismaMarketTransaction['type'];
  actorAddress: string;
  marketId: number;
  voteType: 'trust' | 'distrust';
  votes: number;
  funds: string;
  timestamp: number;
  txHash: string;
};

const schema = z.object({
  profileId: z.preprocess((v) => Number(v), z.number().positive(), {
    message: 'profileId must be a positive number',
  }),
});

type Input = z.infer<typeof schema>;
type Output = MarketTransaction[];

export class MarketTransactionHistoryService extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute({ profileId }: Input): Promise<Output> {
    const transactions = await MarketData.getTransactions(profileId);

    return transactions.map((tx) => ({
      eventId: tx.eventId,
      marketId: tx.marketProfileId,
      actorAddress: tx.actorAddress,
      type: tx.type,
      voteType: tx.isPositive ? 'trust' : 'distrust',
      votes: tx.amount,
      funds: tx.funds,
      txHash: tx.event.txHash,
      timestamp: tx.createdAt.getTime() / 1000,
    }));
  }
}
