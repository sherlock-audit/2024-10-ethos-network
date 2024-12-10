import { isAddressEqualSafe, type PaginatedResponse } from '@ethos/helpers';
import { type TransactionHistoryCache } from '@prisma-pg/client';
import { getAddress } from 'viem';
import { z } from 'zod';
import { MoralisClient } from '../../common/net/moralis/moralis.client.js';
import { Service } from '../service.base.js';
import { type AnyRecord } from '../service.types.js';
import { validators } from '../service.validator.js';

const schema = z
  .object({
    address: validators.address,
    connected: validators.address,
  })
  .merge(validators.paginationSchema());

type Input = z.infer<typeof schema>;
type Output = PaginatedResponse<TransactionHistoryCache>;
const moralis = new MoralisClient();

/**
 * RecentTransactionsService
 *
 * This service retrieves and filters recent transactions between the current user
 * (identified by the 'connected' address) and an arbitrary address across all chains.
 */
export class RecentTransactionsService extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute(input: Input): Promise<Output> {
    const { address, connected } = input;
    const { limit, offset } = input.pagination;
    const results = await moralis.getRecentTransactions(address);

    const filteredResults = results.filter(
      (tx) =>
        isAddressEqualSafe(getAddress(tx.toAddress), connected) ||
        isAddressEqualSafe(getAddress(tx.fromAddress), connected),
    );

    const values = filteredResults.slice(offset, offset + limit);

    return {
      values,
      total: filteredResults.length,
      limit,
      offset,
    };
  }
}
