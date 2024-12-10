import { getUnixTime, type PaginatedResponse } from '@ethos/helpers';
import { z } from 'zod';
import { MarketData } from '../../data/market/index.js';
import { type PrismaMarketTransaction } from '../../data/market/market.data.js';
import { Service } from '../service.base.js';
import { type AnyRecord } from '../service.types.js';
import { validators } from '../service.validator.js';

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

const schema = z
  .object({
    profileId: validators.profileId.optional(),
    voteTypeFilter: z.enum(['trust', 'distrust', 'all']).optional().default('all'),
  })
  .merge(validators.paginationSchema());

type Input = z.infer<typeof schema>;
type Output = PaginatedResponse<MarketTransaction>;

function mapPrismaTransactionToMarketTransaction(tx: PrismaMarketTransaction): MarketTransaction {
  return {
    eventId: tx.eventId,
    marketId: tx.marketProfileId,
    actorAddress: tx.actorAddress,
    type: tx.type,
    voteType: tx.isPositive ? 'trust' : 'distrust',
    votes: tx.amount,
    funds: tx.funds,
    txHash: tx.event.txHash,
    timestamp: getUnixTime(tx.createdAt),
  };
}

export class MarketTransactionHistoryService extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute({ profileId, voteTypeFilter, pagination }: Input): Promise<Output> {
    const transactions = await MarketData.getTransactions({
      profileId,
      voteTypeFilter,
      ...pagination,
    });

    return {
      values: transactions.values.map(mapPrismaTransactionToMarketTransaction),
      total: transactions.total,
      ...pagination,
    };
  }
}

const addressSchema = z
  .object({
    address: validators.address,
    voteTypeFilter: z.enum(['trust', 'distrust', 'all']).optional().default('all'),
  })
  .merge(validators.paginationSchema());

type AddressInput = z.infer<typeof addressSchema>;
type AddressOutput = PaginatedResponse<MarketTransaction>;

export class MarketActivityByAddressService extends Service<typeof addressSchema, Output> {
  validate(params: AnyRecord): AddressInput {
    return this.validator(params, addressSchema);
  }

  async execute({ address, voteTypeFilter, pagination }: AddressInput): Promise<AddressOutput> {
    const transactions = await MarketData.getTransactions({
      actorAddress: address,
      voteTypeFilter,
      ...pagination,
    });

    return {
      values: transactions.values.map(mapPrismaTransactionToMarketTransaction),
      total: transactions.total,
      ...pagination,
    };
  }
}
