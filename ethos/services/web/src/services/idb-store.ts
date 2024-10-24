import { duration } from '@ethos/helpers';
import { type PersistedClient, type Persister } from '@tanstack/react-query-persist-client';
import { get, set, del, createStore, type UseStore, clear } from 'idb-keyval';

function idbFactory() {
  let cachedStore: UseStore;

  return () => {
    if (cachedStore) return cachedStore;

    cachedStore = createStore('ethos', 'react-query');

    return cachedStore;
  };
}

const getStore = idbFactory();

export function createIdbPersister(key: string): Persister {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = duration(100, 'ms').toMilliseconds();

  async function retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    // attempting to access the IDB store while closing generates this error:
    // Failed to execute 'transaction' on 'IDBDatabase': The database connection is closing.
    // but it doesn't take long; so retry. We will recreate the store on each getStore() call
    // this appears to be a bug in Safari - https://bugs.webkit.org/show_bug.cgi?id=273827
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (error instanceof DOMException && error.name === 'InvalidStateError') {
          if (attempt === MAX_RETRIES - 1) throw error;
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
          continue;
        }
        throw error;
      }
    }

    // try one last time and let this one throw any remaining errors
    return await operation();
  }

  return {
    async persistClient(client: PersistedClient) {
      await retryOperation(async () => {
        await set(key, client, getStore());
      });
    },
    async restoreClient() {
      return await retryOperation(async () => await get<PersistedClient>(key, getStore()));
    },
    async removeClient() {
      await retryOperation(async () => {
        await del(key, getStore());
      });
    },
  };
}

export async function clearReactQueryCache() {
  try {
    await clear(getStore());
  } catch (err) {
    return err;
  }

  return null;
}
