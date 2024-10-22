import { duration, isValidAddress } from '@ethos/helpers';
import { type Address } from 'viem';
import { prisma, refreshView } from '../../data/db';
import { type EnsDetailsStrict, type EnsDetailsLoose } from '../net/ens';
import { cachedOperation, createLRUCache } from './lru.cache';

// two layer cache:
// 1. in-memory LRU cache
// 2. database
// (fallback is pull from ens api)

const ONE_HOUR = duration(1, 'hour').toMilliseconds();
const ensAddressCache = createLRUCache<EnsDetailsStrict | null>(ONE_HOUR);
const ensNameCache = createLRUCache<EnsDetailsLoose | null>(ONE_HOUR);

async function getByAddress(address: Address): Promise<EnsDetailsStrict | null> {
  async function getFromDb(): Promise<EnsDetailsStrict | null> {
    const cache = await prisma.ensCache.findUnique({
      where: {
        address: address.toLowerCase(),
        updatedAt: {
          gte: new Date(Date.now() - duration(1, 'day').toMilliseconds()),
        },
      },
    });

    if (!cache) {
      return null;
    }

    return {
      name: cache?.ensName,
      avatar: cache?.avatarUrl,
      address,
    };
  }

  return await cachedOperation('ensCacheByAddress', ensAddressCache, address, getFromDb);
}
async function getByName(ensName: string): Promise<EnsDetailsLoose | null> {
  async function getFromDb(): Promise<EnsDetailsLoose | null> {
    const cache = await prisma.ensCache.findFirst({
      where: {
        ensName: {
          equals: ensName,
          mode: 'insensitive',
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!cache) {
      return null;
    }

    return {
      name: cache?.ensName,
      avatar: cache?.avatarUrl,
      address: isValidAddress(cache?.address) ? cache?.address : null,
    };
  }

  return await cachedOperation('ensCacheByName', ensNameCache, ensName, getFromDb);
}

async function set({ name, avatar, address }: EnsDetailsStrict): Promise<void> {
  await prisma.ensCache.upsert({
    where: {
      address: address.toLowerCase(),
    },
    update: { ensName: name, avatarUrl: avatar },
    create: {
      address: address.toLowerCase(),
      ensName: name,
      avatarUrl: avatar,
    },
  });

  await refreshView('names');
}

export const ensDetails = { set, getByAddress, getByName };
