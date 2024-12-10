import { useDebouncedValue } from '@ethos/common-ui';
import { formatNumber } from '@ethos/helpers';
import { useCallback, useMemo } from 'react';
import { useSellVotes, useMyVotes, useSimulateSellVotes } from '~/hooks/market.tsx';

import { useTransactionForm } from '~/routes/market.$id/transaction-context.tsx';

export function useSellSubmit() {
  const { state, setState } = useTransactionForm();
  const { market } = state;

  const { data: myOwnedVotes, refetch: refetchMyVotes, error } = useMyVotes(market.profileId);

  const sell = useSellVotes();
  const sellVotes = useCallback(async () => {
    setState({ transactionState: 'pending' });
    try {
      await sell.mutateAsync({
        profileId: market.profileId,
        amount: Number(state.sellAmount),
        isPositive: state.voteType === 'trust',
      });
      setState({ transactionState: 'success' });
      refetchMyVotes();
    } catch (error: unknown) {
      setState({ transactionState: 'error' });
      throw error;
    }
  }, [market.profileId, refetchMyVotes, sell, setState, state.sellAmount, state.voteType]);

  return { sellVotes, myOwnedVotes, error };
}

export function useSellSimulation() {
  const { state } = useTransactionForm();
  const { market, voteType } = state;
  const debouncedSellAmount = useDebouncedValue(state.sellAmount, 500);

  const { data: simulation } = useSimulateSellVotes({
    profileId: market.profileId,
    voteType,
    votes: Number(debouncedSellAmount),
  });

  return simulation;
}

export function useSellSimulationImpact() {
  const { state } = useTransactionForm();
  const { market, voteType } = state;

  const simulation = useSellSimulation();

  const simulationImpact = useMemo(() => {
    if (!simulation || simulation.error) {
      return null;
    }
    const existingTrustPercentage = market.stats.trustPercentage;

    let newTrustPercentage: number;

    if (voteType === 'trust') {
      const newTrustVotes = market.stats.trustVotes - Number(simulation.votesSold);
      newTrustPercentage = (newTrustVotes / (newTrustVotes + market.stats.distrustVotes)) * 100;
    } else {
      const newDistrustVotes = market.stats.distrustVotes - Number(simulation.votesSold);
      newTrustPercentage =
        (market.stats.trustVotes / (market.stats.trustVotes + newDistrustVotes)) * 100;
    }

    const percentageChange = newTrustPercentage - existingTrustPercentage;

    return percentageChange;
  }, [
    market.stats.distrustVotes,
    market.stats.trustPercentage,
    market.stats.trustVotes,
    simulation,
    voteType,
  ]);

  return {
    impact: simulationImpact,
    trend: simulationImpact ? (simulationImpact > 0 ? ('up' as const) : ('down' as const)) : null,
    formattedImpact: simulationImpact
      ? `${formatNumber(simulationImpact, { maximumFractionDigits: 2 })}%`
      : '--',
    simulationError: simulation?.error,
  };
}
