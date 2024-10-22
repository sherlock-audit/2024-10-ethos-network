import { type AddressHistoryCache } from '@prisma/client';
import {
  ADDRESS_HISTORY_CACHE_DURATION,
  NO_TRANSACTIONS_CACHE_DURATION,
  NO_TRANSACTIONS_DATE,
  processAddressHistoryCache,
} from '../history.cache.check';

const EXPIRED_DATE = new Date(Date.now() - ADDRESS_HISTORY_CACHE_DURATION - 10000);
const RECENT_DATE = new Date(Date.now() - ADDRESS_HISTORY_CACHE_DURATION + 10000);
const NO_TRANSACTIONS_EXPIRED_DATE = new Date(Date.now() - NO_TRANSACTIONS_CACHE_DURATION - 10000);
const NO_TRANSACTIONS_RECENT_DATE = new Date(Date.now() - NO_TRANSACTIONS_CACHE_DURATION + 10000);
const ARBITRARY_DATE = new Date('2022-12-31T00:00:00.000Z');
const address = '0x123';

describe('processAddressHistoryCache', () => {
  test('returns undefined when cache is null', () => {
    expect(processAddressHistoryCache(null)).toBeUndefined();
  });

  test('returns the firstTransaction date when it exists and is recent', () => {
    const cache: AddressHistoryCache = {
      address,
      firstTransaction: ARBITRARY_DATE,
      createdAt: EXPIRED_DATE,
      updatedAt: RECENT_DATE,
    };
    expect(processAddressHistoryCache(cache)).toEqual(ARBITRARY_DATE);
  });

  test('returns undefined when firstTransaction date exists and is expired', () => {
    const cache: AddressHistoryCache = {
      address,
      firstTransaction: ARBITRARY_DATE,
      createdAt: EXPIRED_DATE,
      updatedAt: EXPIRED_DATE,
    };
    expect(processAddressHistoryCache(cache)).toBeUndefined();
  });

  test('returns null when NO_TRANSACTIONS_DATE is recent', () => {
    const cache: AddressHistoryCache = {
      address,
      firstTransaction: NO_TRANSACTIONS_DATE,
      createdAt: NO_TRANSACTIONS_EXPIRED_DATE,
      updatedAt: NO_TRANSACTIONS_RECENT_DATE,
    };
    expect(processAddressHistoryCache(cache)).toBeNull();
  });

  test('returns undefined when NO_TRANSACTIONS_DATE is expired', () => {
    const cache: AddressHistoryCache = {
      address,
      firstTransaction: NO_TRANSACTIONS_DATE,
      createdAt: NO_TRANSACTIONS_EXPIRED_DATE,
      updatedAt: NO_TRANSACTIONS_EXPIRED_DATE,
    };
    expect(processAddressHistoryCache(cache)).toBeUndefined();
  });

  test('returns null when firstTransaction is the same date but a different object', () => {
    const DIFF_DATE = new Date(0);
    const cache: AddressHistoryCache = {
      address,
      firstTransaction: DIFF_DATE,
      createdAt: NO_TRANSACTIONS_RECENT_DATE,
      updatedAt: NO_TRANSACTIONS_RECENT_DATE,
    };
    expect(processAddressHistoryCache(cache)).toBe(null);
  });
});
