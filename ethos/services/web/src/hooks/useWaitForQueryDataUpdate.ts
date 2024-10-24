'use client';
import {
  type UseInfiniteQueryResult,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { invalidate, type Keys } from 'constant/queries/cache.invalidation';
import { eventBus, type Event } from 'utils/event-bus';

type AllowedTypes<T> = UseQueryResult<T> | UseInfiniteQueryResult<T>;

type Config<T, U> = {
  invalidationQueryKeys?: Keys;
  pollingInterval?: number;
  pollingRetryCount?: number;
  customRefetch?: (query: T) => void;
  onDateReceived?: (data: U) => void;
};

type State = {
  isPolling: boolean;
  refetchAttempts: number;
};

export function useQueryAwaitDataUpdate<T extends AllowedTypes<U>, U>(
  query: T,
  getUniqueIdentifier: (item: NonNullable<T['data']>) => string | number,
  events: Event[],
  config: Config<T, U> = {},
): T & { isPolling: boolean; isInProgress: boolean } {
  const [state, setState] = useState<State>({
    isPolling: false,
    refetchAttempts: 0,
  });
  const [lastIdentifier, setLastIdentifier] = useState<string | number | null>(null);
  const queryClient = useQueryClient();
  const pollingInterval = config?.pollingInterval ?? 2000;
  const maxRetryCount = config?.pollingRetryCount ?? 3;
  const { data, isPending, refetch } = query;

  const invalidateQuery = useCallback(
    async (keys: Keys) => {
      await invalidate(queryClient, [keys]);
    },
    [queryClient],
  );

  useEffect(() => {
    const newIdentifier = data ? getUniqueIdentifier(data) : null;

    if (newIdentifier !== lastIdentifier) {
      setLastIdentifier(newIdentifier);
      setState({ isPolling: false, refetchAttempts: 0 });

      if (config.onDateReceived && data !== undefined) {
        config.onDateReceived(data);
      }
    }

    const handleEvent = () => {
      setState({ isPolling: true, refetchAttempts: 0 });
    };

    events.forEach((event) => {
      eventBus.on(event, handleEvent);
    });

    if (state.isPolling && !isPending) {
      const timeoutId = window.setTimeout(() => {
        if (state.refetchAttempts >= maxRetryCount) {
          setState((prev) => ({ ...prev, isPolling: false }));
        } else {
          if (config.invalidationQueryKeys) {
            invalidateQuery(config.invalidationQueryKeys);
          } else if (config.customRefetch) {
            config.customRefetch(query);
          } else {
            refetch();
          }
          setState((prev) => ({ ...prev, refetchAttempts: prev.refetchAttempts + 1 }));
        }
      }, pollingInterval);

      return () => {
        clearTimeout(timeoutId);
      };
    }

    return () => {
      events.forEach((event) => {
        eventBus.off(event, handleEvent);
      });
    };
  }, [
    data,
    refetch,
    isPending,
    lastIdentifier,
    state,
    getUniqueIdentifier,
    config,
    events,
    invalidateQuery,
    pollingInterval,
    maxRetryCount,
    query,
  ]);

  return { isInProgress: state.isPolling || isPending, isPolling: state.isPolling, ...query };
}
