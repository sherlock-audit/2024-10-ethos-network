/*
 * Sourced from https://github.com/MoralisWeb3/Moralis-JS-SDK/tree/main/packages/common/evmUtils/src/generated/types
 */

export type EvmWalletActiveChainsJSON = {
  readonly address: string;
  readonly active_chains: EvmWalletActiveChainJSON[];
};
type EvmWalletActiveChainJSON = {
  readonly chain: string;
  readonly chain_id: string;
  readonly first_transaction?: EvmTransactionTimestampJSON;
  readonly last_transaction?: EvmTransactionTimestampJSON;
};
type EvmTransactionTimestampJSON = {
  readonly block_number: string;
  readonly block_timestamp: string;
  readonly transaction_hash?: string;
};

export type AddressTransactionHistoryApiResponse = {
  cursor: string | null;
  page_size: number;
  limit: number;
  result: EvmWalletHistoryTransactionJSON[];
  page: number;
};

export type EvmWalletHistoryTransactionJSON = {
  readonly hash: string;
  readonly nonce: string;
  readonly transaction_index: string;
  readonly from_address: EvmAddressJSON;
  readonly from_address_label?: string;
  readonly from_address_entity_logo?: string;
  readonly to_address: EvmAddressJSON;
  readonly to_address_label?: string;
  readonly to_address_entity_logo?: string;
  readonly value: string;
  readonly gas?: string;
  readonly gas_price: string;
  readonly input?: string;
  readonly receipt_cumulative_gas_used: string;
  readonly receipt_gas_used: string;
  readonly receipt_status: string;
  readonly block_timestamp: string;
  readonly block_number: BigNumberJSON;
  readonly block_hash: string;
  // readonly internal_transactions?: EvmInternalTransactionJSON[];
  readonly category: EvmETransactionCategoryJSON;
  readonly possible_spam?: boolean;
  readonly method_label?: string;
  readonly summary: string;
  // readonly nft_transfers: EvmWalletHistoryNftTransferJSON[];
  // readonly erc20_transfers: EvmWalletHistoryErc20TransferJSON[];
  // readonly native_transfers: EvmNativeTransferJSON[];
};
/*
interface EvmInternalTransactionJSON {
  readonly transaction_hash: string;
  readonly block_number: string;
  readonly block_hash: string;
  readonly type: string;
  readonly from: string;
  readonly to: string;
  readonly value: string;
  readonly gas: string;
  readonly gas_used: string;
  readonly input: string;
  readonly output: string;
}

interface EvmWalletHistoryNftTransferJSON {
  readonly token_address: EvmAddressJSON;
  readonly token_id: string;
  readonly from_address: EvmAddressJSON;
  readonly from_address_label?: string;
  readonly to_address: EvmAddressJSON;
  readonly to_address_label?: string;
  readonly value: string;
  readonly amount: string;
  readonly contract_type: string;
  readonly transaction_type: string;
  readonly log_index: number;
  readonly operator?: string;
  readonly possible_spam: boolean;
  readonly verified_collection?: boolean;
  readonly direction: string;
  readonly collection_logo?: string;
  readonly collection_banner_image?: string;
  readonly normalized_metadata?: EvmNormalizedMetadataJSON;
}

interface EvmWalletHistoryErc20TransferJSON {
  readonly token_name: string;
  readonly token_symbol: string;
  readonly token_logo: string;
  readonly token_decimals: string;
  readonly address: EvmAddressJSON;
  readonly block_timestamp?: string;
  readonly to_address: EvmAddressJSON;
  readonly to_address_label?: string;
  readonly from_address: EvmAddressJSON;
  readonly from_address_label?: string;
  readonly value: string;
  readonly value_formatted: string;
  readonly log_index: number;
  readonly possible_spam: boolean;
  readonly verified_contract: boolean;
}

interface EvmNativeTransferJSON {
  readonly from_address: EvmAddressJSON;
  readonly from_address_label?: string;
  readonly to_address?: EvmAddressJSON;
  readonly to_address_label?: string;
  readonly value: string;
  readonly value_formatted: string;
  readonly direction?: string;
  readonly internal_transaction: boolean;
  readonly token_symbol: string;
  readonly token_logo: string;
}

interface EvmNormalizedMetadataJSON {
  readonly name?: string;
  readonly description?: string;
  readonly image?: string;
  readonly external_link?: string;
  readonly animation_url?: string;
  readonly attributes?: EvmNormalizedMetadataAttributeJSON[];
}

interface EvmNormalizedMetadataAttributeJSON {
  readonly trait_type?: string;
  readonly value?: EvmNormalizedMetadataAttributeValueJSON;
  readonly display_type?: string;
  readonly max_value?: number;
  readonly trait_count?: number;
  readonly order?: number;
}

type EvmNormalizedMetadataAttributeValueJSON = object;
*/
type EvmAddressJSON = string;
type BigNumberJSON = string;
type EvmETransactionCategoryJSON =
  | 'send'
  | 'receive'
  | 'token send'
  | 'token receive'
  | 'nft send'
  | 'nft receive'
  | 'token swap'
  | 'deposit'
  | 'withdraw'
  | 'nft purchase'
  | 'nft sale'
  | 'airdrop'
  | 'mint'
  | 'burn'
  | 'borrow'
  | 'contract interaction';
