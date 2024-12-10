import { formatNumber } from '@ethos/helpers';
import { useCallback, useMemo } from 'react';

import { parseEther } from 'viem';
import { useBuyVotes, useSimulateBuyVotes } from '~/hooks/market.tsx';
import { useTransactionForm } from '~/routes/market.$id/transaction-context.tsx';

export function useBuySubmit() {
  const { state, setState } = useTransactionForm();
  const { market, voteType } = state;
  const simulation = useBuySimulation();

  const buy = useBuyVotes();

  const buyVotes = useCallback(async () => {
    setState({ transactionState: 'pending' });
    try {
      await buy.mutateAsync({
        profileId: market.profileId,
        buyAmount: parseEther(state.buyAmount.toString()),
        isPositive: voteType === 'trust',
        expectedVotes: simulation?.votes ?? BigInt(Number.MAX_SAFE_INTEGER),
        slippageBasisPoints: BigInt(state.slippageBasisPoints),
      });
      setState({ transactionState: 'success' });
    } catch (error: unknown) {
      console.error('Error occurred during buy transaction:', error);

      const message = error instanceof Error ? error.message : 'Something went wrong';
      setState({
        transactionState: 'error',
        transactionError: message,
      });
    }
  }, [
    buy,
    market.profileId,
    setState,
    simulation?.votes,
    state.buyAmount,
    state.slippageBasisPoints,
    voteType,
  ]);

  return { buyVotes, simulation };
}

export function useBuySimulation() {
  const { state } = useTransactionForm();
  const { market, voteType } = state;
  const { data: simulation } = useSimulateBuyVotes({
    profileId: market.profileId,
    voteType,
    funds: parseEther(state.buyAmount.toString()),
  });

  return simulation;
}

export function useBuySimulationImpact() {
  const { state } = useTransactionForm();
  const { market, voteType } = state;

  const simulation = useBuySimulation();
  const simulationImpact = useMemo(() => {
    if (!simulation || simulation.error) {
      return null;
    }
    const existingTrustPercentage = market.stats.trustPercentage;

    let newTrustPercentage: number;

    if (voteType === 'trust') {
      const newTrustVotes = market.stats.trustVotes + Number(simulation.votes);
      newTrustPercentage = (newTrustVotes / (newTrustVotes + market.stats.distrustVotes)) * 100;
    } else {
      const newDistrustVotes = market.stats.distrustVotes + Number(simulation.votes);
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
