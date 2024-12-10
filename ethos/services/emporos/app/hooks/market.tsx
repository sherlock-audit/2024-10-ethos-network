import { isValidAddress } from '@ethos/helpers';
import { useFetcher, useRouteLoaderData } from '@remix-run/react';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getAddress, zeroAddress } from 'viem';
import { useMarketUser } from './marketUser.tsx';
import { useWithTxMutation } from './transaction.tsx';
import { useBlockchainManager } from '~/contexts/blockchain-manager.context.tsx';
import { type loader as holdingsBalanceLoader } from '~/routes/api.holdings-balance.ts';

import { type loader as rootLoader } from '~/routes/market.$id/route.tsx';

export function useMarketHook(profileId: number) {
  const { blockchainManager } = useBlockchainManager();

  return useQuery({
    queryKey: ['market', profileId],
    queryFn: async () => {
      return await blockchainManager.reputationMarket.getMarket(profileId);
    },
    enabled: Boolean(profileId),
  });
}

export function useMyVotes(profileId: number) {
  const { blockchainManager } = useBlockchainManager();
  const { wallet } = useMarketUser();

  return useQuery({
    queryKey: ['market-my-votes', profileId],
    staleTime: 0,
    queryFn: async () => {
      if (!wallet?.address) return null;
      const votes = await blockchainManager.reputationMarket.getUserVotes(
        getAddress(wallet.address),
        profileId,
      );

      return {
        trustVotes: votes.trustVotes.toString(),
        distrustVotes: votes.distrustVotes.toString(),
      };
    },
  });
}

export function useBuyVotes() {
  const { blockchainManager } = useBlockchainManager();

  return useWithTxMutation({
    mutationFn: async ({
      profileId,
      isPositive,
      buyAmount,
      expectedVotes,
      slippageBasisPoints,
    }: {
      profileId: number;
      buyAmount: bigint;
      isPositive: boolean;
      expectedVotes: bigint;
      slippageBasisPoints: bigint;
    }) => {
      return await blockchainManager.reputationMarket.buyVotes(
        profileId,
        buyAmount,
        isPositive,
        expectedVotes,
        slippageBasisPoints,
      );
    },
  });
}

export function useSellVotes() {
  const { blockchainManager } = useBlockchainManager();

  return useWithTxMutation({
    mutationFn: async ({
      profileId,
      isPositive,
      amount,
    }: {
      profileId: number;
      isPositive: boolean;
      amount: number;
    }) => {
      return await blockchainManager.reputationMarket.sellVotes(profileId, isPositive, amount);
    },
  });
}

export function useSimulateBuyVotes({
  profileId,
  voteType,
  funds,
  onError,
}: {
  profileId: number;
  voteType: 'trust' | 'distrust';
  funds: bigint;
  onError?: (error: string) => void;
}) {
  const { blockchainManager } = useBlockchainManager();

  return useQuery({
    queryKey: ['simulate-buy-votes', profileId, voteType, funds.toString()],
    // Never cache the simulations.
    staleTime: 0,
    queryFn: async () => {
      try {
        const isPositive = voteType === 'trust';
        const { votesBought, newVotePrice, fundsPaid } =
          await blockchainManager.reputationMarket.simulateBuy(profileId, isPositive, funds);

        return {
          newPrice: newVotePrice,
          votes: votesBought,
          newFunds: fundsPaid,
        };
      } catch (error) {
        if (error instanceof Error) {
          onError?.(error.message);

          return { error: error.message };
        }

        onError?.('Unexpected error');

        return { error: 'Unexpected error' };
      }
    },

    enabled: profileId > 0 && funds > 0n,
  });
}

export function useSimulateSellVotes({
  profileId,
  voteType,
  votes,
  onError,
}: {
  profileId: number;
  voteType: 'trust' | 'distrust';
  votes: number;
  onError?: (error: string) => void;
}) {
  const { wallet } = useMarketUser();
  const { blockchainManager } = useBlockchainManager();

  return useQuery({
    queryKey: ['simulate-sell-votes', profileId, voteType, votes],
    // Never cache the simulations.
    staleTime: 0,
    queryFn: async () => {
      try {
        const isPositive = voteType === 'trust';
        const { votesSold, newVotePrice, fundsReceived } =
          await blockchainManager.reputationMarket.simulateSell(
            profileId,
            isPositive,
            votes,
            getAddress(wallet?.address ?? zeroAddress),
          );

        return {
          votesSold,
          newVotePrice,
          fundsReceived,
        };
      } catch (error) {
        if (error instanceof Error) {
          onError?.(error.message);

          return { error: error.message };
        }

        onError?.('Unexpected error');

        return { error: 'Unexpected error' };
      }
    },

    enabled: profileId > 0 && votes > 0 && Boolean(wallet?.address),
  });
}

export function useRouteMarketInfo() {
  const rootData = useRouteLoaderData<typeof rootLoader>('routes/market.$id');

  if (!rootData?.market) {
    throw new Error('No market found in root loader.');
  }

  return rootData.market;
}

export function useHoldingsBalanceByAddress(address: string | undefined) {
  const fetcher = useFetcher<typeof holdingsBalanceLoader>();

  useEffect(() => {
    if (!isValidAddress(address)) {
      return;
    }

    if (address && fetcher.state === 'idle' && !fetcher.data) {
      fetcher.load(`/api/holdings-balance?address=${address}`);
    }
  }, [address, fetcher]);

  return fetcher.data;
}
