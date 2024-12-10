import { type EthosEnvironment, isEnvironment } from '@ethos/env';
import { useMatches } from '@remix-run/react';
import { useMemo } from 'react';

/**
 * This base hook is used in other hooks to quickly search for specific data
 * across all loader data using useMatches.
 */
export function useMatchesData(id: string): Record<string, unknown> | undefined {
  const matchingRoutes = useMatches();
  const route = useMemo(
    () => matchingRoutes.find((route) => route.id === id),
    [matchingRoutes, id],
  );

  return route?.data as Record<string, unknown>;
}

export function useEnvironment(): EthosEnvironment {
  const data = useMatchesData('root');

  if (!data || !isEnvironment(data.environment)) {
    throw new Error('No environment found in root loader.');
  }

  return data.environment;
}
