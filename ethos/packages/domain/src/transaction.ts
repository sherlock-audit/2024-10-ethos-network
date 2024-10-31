import { type Review, type Vouch } from '@ethos/blockchain-manager';
import { type Address } from 'viem';

// Represents an arbitrary blockchain transaction
// based on moralis.type.ts EvmWalletHistoryTransactionJSON
export type Transaction = {
  hash: string;
  from_address: Address;
  from_address_label?: string;
  from_address_entity_logo?: string;
  to_address: Address;
  to_address_label?: string;
  to_address_entity_logo?: string;
  value: string;
  block_timestamp: number;
  category: string;
  summary: string;
};

/**
 * Represents a collection of transactions for a given address
 * @property {Address} address - The common address that all these transactions are associated with
 * @property {number} last_transaction_timestamp - Unix timestamp of the most recent transaction
 * @property {Transaction[]} transactions - The transactions associated with the address
 */
export type Interaction = {
  address: Address;
  /**
   * unix timestamp
   */
  last_transaction_timestamp: number;
  transactions: Transaction[];
};

// Represents a relationship between a user and an address
// including any reviews or active vouches
export type Relationship = Interaction & {
  reviews: Review[];
  vouch: Vouch | null;
};
