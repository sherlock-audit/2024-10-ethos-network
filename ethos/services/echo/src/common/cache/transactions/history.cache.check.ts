import { duration } from '@ethos/helpers';
import { type AddressHistoryCache } from '@prisma/client';

// first transaction per address should never change
export const ADDRESS_HISTORY_CACHE_DURATION = duration(1, 'year').toMilliseconds();
export const NO_TRANSACTIONS_DATE = new Date(0);
export const NO_TRANSACTIONS_CACHE_DURATION = duration(1, 'hour').toMilliseconds();

// Date = first transaction found
// undefined = no address history found (ie, we haven't pulled it from moralis)
// null = no first transactions found (ie, we pulled from moralis and found no transactions)
export function processAddressHistoryCache(
  cached: AddressHistoryCache | null,
): Date | undefined | null {
  if (!cached) return undefined;

  const expiresAt = new Date(Date.now() - ADDRESS_HISTORY_CACHE_DURATION);

  // Check if the cache is expired
  if (cached.updatedAt < expiresAt) {
    return undefined;
  }

  // check if we've cached that there's no transactions
  if (cached.firstTransaction.getTime() === NO_TRANSACTIONS_DATE.getTime()) {
    const noTransactionsExpiresAt = new Date(Date.now() - NO_TRANSACTIONS_CACHE_DURATION);

    // if the no transactions cache is expired, return undefined
    if (cached.updatedAt < noTransactionsExpiresAt) {
      return undefined;
    }

    // if there's no first transaction, but the cache is recent, return null
    return null;
  }

  return cached.firstTransaction;
}
