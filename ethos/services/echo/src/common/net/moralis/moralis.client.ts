import { isValidAddress } from '@ethos/helpers';
import { type TransactionHistoryCache } from '@prisma/client';
import { type Address } from 'viem';
import { addressHistoryCache, transactionCache } from '../../cache/transactions/transaction.cache';
import { config } from '../../config';
import {
  type AddresssTransactionHistoryApiResponse as AddressTransactionHistoryApiResponse,
  type EvmWalletActiveChainsJSON,
  type EvmWalletHistoryTransactionJSON,
} from './moralis.type';

const MORALIS_API = 'https://deep-index.moralis.io/api/v2.2/';
const CHAIN_ACTIVITY = 'wallets/{address}/chains';
const TRANSACTION_HISTORY = 'wallets/{address}/history';
const API_PARAMS = {
  limit: '100',
  order: 'DESC',
};

function buildMoralisRequestUrl(address: Address): string {
  const url = new URL(`${MORALIS_API}${TRANSACTION_HISTORY.replace('{address}', address)}`);
  url.search = new URLSearchParams(API_PARAMS).toString();

  return url.toString();
}

export class MoralisClient {
  private readonly memoizedFirstTxnDate = new Map<string, Date | null>();
  private readonly headers;

  constructor() {
    this.headers = {
      accept: 'application/json',
      'X-API-Key': config.MORALIS_API_KEY,
    };
  }

  /**
   * Fetches the transaction history for a given address using the Moralis Wallet API.
   *
   * This method retrieves the most recent transactions for the specified address.
   * By default, it returns up to 100 transactions per request.
   *
   * @see {@link https://docs.moralis.io/web3-data-api/evm/reference/wallet-api/get-wallet-history}
   * for more details on the Moralis Wallet API.
   *
   * @param address - The Ethereum address to fetch transaction history for
   * @returns A Promise resolving to an array of EvmWalletHistoryTransactionJSON objects
   */
  async getAddressTransactionHistory(address: string): Promise<EvmWalletHistoryTransactionJSON[]> {
    if (!isValidAddress(address)) {
      return [];
    }

    const url = buildMoralisRequestUrl(address);

    const response = await fetch(url, {
      method: 'GET',
      headers: this.headers,
    });

    const transactionApiResponse: AddressTransactionHistoryApiResponse = await response.json();
    const evmAddressTransactions: EvmWalletHistoryTransactionJSON[] =
      transactionApiResponse.result.map((tx: any) => ({
        hash: tx.hash,
        nonce: tx.nonce,
        transaction_index: tx.transaction_index,
        from_address: tx.from_address,
        from_address_label: tx.from_address_label,
        from_address_entity_logo: tx.from_address_entity_logo,
        to_address: tx.to_address,
        to_address_label: tx.to_address_label,
        to_address_entity_logo: tx.to_address_entity_logo,
        value: tx.value,
        gas: tx.gas,
        gas_price: tx.gas_price,
        input: tx.input,
        receipt_cumulative_gas_used: tx.receipt_cumulative_gas_used,
        receipt_gas_used: tx.receipt_gas_used,
        receipt_status: tx.receipt_status,
        block_timestamp: tx.block_timestamp,
        block_number: tx.block_number,
        block_hash: tx.block_hash,
        // internal_transactions: tx.internal_transactions,
        category: tx.category,
        possible_spam: tx.possible_spam,
        method_label: tx.method_label,
        summary: tx.summary,
        // nft_transfers: tx.nft_transfers,
        // erc20_transfers: tx.erc20_transfers,
        // native_transfers: tx.native_transfers,
      }));

    return evmAddressTransactions;
  }

  public async getRecentTransactions(address: Address): Promise<TransactionHistoryCache[]> {
    // get from db; memoize if successful
    const cached = await transactionCache.get(address);

    if (cached && cached.length > 0) {
      return cached;
    }

    // get from moralis; cache if successful
    const transactions = await this.getAddressTransactionHistory(address);
    const cachedTransactions = await transactionCache.set(transactions);

    return cachedTransactions;
  }

  async getAddressActiveChains(address: string): Promise<EvmWalletActiveChainsJSON> {
    const response = await fetch(`${MORALIS_API}${CHAIN_ACTIVITY.replace('{address}', address)}`, {
      method: 'GET',
      headers: this.headers,
    });
    const data = await response.json();

    if (!('address' in data && 'active_chains' in data)) {
      throw new Error('Unexpected response format');
    }
    const evmWalletActiveChains: EvmWalletActiveChainsJSON = {
      address: data.address,
      active_chains: data.active_chains.map((chain: any) => ({
        chain: chain.chain,
        chain_id: chain.chain_id,
        first_transaction: chain.first_transaction
          ? {
              block_number: chain.first_transaction.block_number,
              block_timestamp: chain.first_transaction.block_timestamp,
              transaction_hash: chain.first_transaction.transaction_hash,
            }
          : undefined,
        last_transaction: chain.last_transaction
          ? {
              block_number: chain.last_transaction.block_number,
              block_timestamp: chain.last_transaction.block_timestamp,
              transaction_hash: chain.last_transaction.transaction_hash,
            }
          : undefined,
      })),
    };

    return evmWalletActiveChains;
  }

  public async getFirstTransactionTimestamp(address: Address): Promise<Date | null> {
    // check the in-memory cache first
    const memoized = this.memoizedFirstTxnDate.get(address);

    if (memoized) return memoized;

    // then check db
    const cachedFirstTransaction: Date | undefined | null = await addressHistoryCache.get(address);

    if (cachedFirstTransaction) {
      this.memoizedFirstTxnDate.set(address, cachedFirstTransaction);

      return cachedFirstTransaction;
    }
    // null is a valid value (ie, no history) for the cache; undefined means not set
    if (cachedFirstTransaction === null) {
      return null;
    }

    // no cache hit; fetch from Moralis
    const now = new Date();
    let oldest = now;
    const addressHistory = await this.getAddressActiveChains(address);

    if (!addressHistory) {
      // avoid hitting the API again if we know there's no history
      await addressHistoryCache.set(address, null);

      return null;
    }

    // find the oldest transaction across all chains
    for (const chain of addressHistory.active_chains) {
      const firstTransaction = chain.first_transaction?.block_timestamp;

      if (firstTransaction) {
        const firstTransactionDate = new Date(firstTransaction);

        if (firstTransactionDate < oldest) {
          oldest = firstTransactionDate;
        }
      }
    }

    if (oldest === now) {
      // avoid hitting the API again if we know there's no history
      await addressHistoryCache.set(address, null);

      return null;
    }
    // cache via memoization and db with the oldest transaction date
    this.memoizedFirstTxnDate.set(address, oldest);
    await addressHistoryCache.set(address, oldest);

    return oldest;
  }
}
