import { duration } from '@ethos/helpers';
import { type AddressHistoryCache, type TransactionHistoryCache } from '@prisma-pg/client';
import { type Address } from 'viem';
import { prisma } from '../../../data/db.js';
import { type EvmWalletHistoryTransactionJSON } from '../../net/moralis/moralis.type.js';
import { NO_TRANSACTIONS_DATE, processAddressHistoryCache } from './history.cache.check.js';

const TRANSACTION_CACHE_DURATION = duration(1, 'day').toMilliseconds();

async function getTxnHistory(address: Address): Promise<TransactionHistoryCache[] | null> {
  const cached = await prisma.transactionHistoryCache.findMany({
    where: {
      OR: [
        { fromAddress: { equals: address, mode: 'insensitive' } },
        { toAddress: { equals: address, mode: 'insensitive' } },
      ],
      updatedAt: { gte: new Date(Date.now() - TRANSACTION_CACHE_DURATION) },
    },
    orderBy: {
      blockTimestamp: 'asc',
    },
  });

  return cached;
}

async function setTxnHistory(
  transactions: EvmWalletHistoryTransactionJSON[],
): Promise<TransactionHistoryCache[]> {
  const transactionHistory: TransactionHistoryCache[] = [];

  const upsertOperations = transactions.map(async (transaction) => {
    const transactionData: TransactionHistoryCache = {
      fromAddress: transaction.from_address,
      toAddress: transaction.to_address,
      hash: transaction.hash,
      createdAt: new Date(),
      updatedAt: new Date(),
      value: transaction.value,
      blockNumber: parseInt(transaction.block_number, 10),
      blockTimestamp: new Date(transaction.block_timestamp),
      category: transaction.category,
      summary: transaction.summary,
      fromAddressLabel: transaction.from_address_label ?? null,
      fromAddressLogo: transaction.from_address_entity_logo ?? null,
      toAddressLabel: transaction.to_address_label ?? null,
      toAddressLogo: transaction.to_address_entity_logo ?? null,
    };

    transactionHistory.push(transactionData);

    const txnHistory = await prisma.transactionHistoryCache.upsert({
      where: { hash: transaction.hash },
      create: transactionData,
      update: transactionData,
    });

    return txnHistory;
  });

  await Promise.all(upsertOperations);

  return transactionHistory;
}

async function getAddrHistory(address: Address): Promise<Date | undefined | null> {
  const cached = await prisma.addressHistoryCache.findUnique({
    where: { address },
  });

  return processAddressHistoryCache(cached);
}

async function setAddrHistory(
  address: Address,
  firstTransaction: Date | null,
): Promise<AddressHistoryCache> {
  const cached = await prisma.addressHistoryCache.upsert({
    where: { address },
    create: { address, firstTransaction: firstTransaction ?? NO_TRANSACTIONS_DATE },
    update: { firstTransaction: firstTransaction ?? NO_TRANSACTIONS_DATE },
  });

  return cached;
}

export const transactionCache = {
  get: getTxnHistory,
  set: setTxnHistory,
};

export const addressHistoryCache = {
  get: getAddrHistory,
  set: setAddrHistory,
};
