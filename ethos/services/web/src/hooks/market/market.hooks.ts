import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type Address, formatEther, parseEther, zeroAddress } from 'viem';
import { useBlockchainManager } from '../../contexts/blockchain-manager.context';
import { cacheKeysFor, invalidate } from 'constant/queries/cache.invalidation';
import { cacheKeys } from 'constant/queries/queries.constant';
import { useCurrentUser } from 'contexts/current-user.context';
import { useWithTxMutation } from 'hooks/api/blockchain-manager/useWithTxMutation';
import { echoApi } from 'services/echo';

/* HELPER FUNCTIONS */
export const MAX_VOTE_PRICE = parseEther('0.001');

export function votePriceToPercentage(price: bigint): string {
  if (!price) return '0%';

  return (
    ((Number(formatEther(price)) / Number(formatEther(MAX_VOTE_PRICE))) * 100).toFixed(2) + '%'
  );
}

/* CACHE KEYS */
const SIMULATE_BUY_KEY = 'simulateBuy';
const SIMULATE_SELL_KEY = 'simulateSell';

/* READ HOOKS */

export function useMarketInfo(profileId?: number) {
  return useQuery({
    queryKey: cacheKeys.market.info(profileId ?? 0),
    queryFn: async () => {
      if (!profileId) return null;

      return await echoApi.markets.info(profileId ?? 0);
    },
  });
}

export function useMarketExists(profileId?: number): boolean {
  const { data: market, isPending } = useMarketInfo(profileId);

  return !isPending && Boolean(market);
}

export function useAllMarkets() {
  return useQuery({
    queryKey: cacheKeys.market.all,
    queryFn: async () => {
      return await echoApi.markets.search({});
    },
  });
}

export function useMarketPriceHistory(
  profileId: number | undefined = 0,
  timeWindow: NonNullable<Parameters<typeof echoApi.markets.priceHistory>[1]>,
) {
  return useQuery({
    queryKey: cacheKeys.market.priceHistory(profileId, timeWindow),
    queryFn: async () => {
      return await echoApi.markets.priceHistory(profileId, timeWindow);
    },
    enabled: Boolean(profileId) && profileId > 0,
  });
}

export function useMarketTransactionHistory(profileId: number) {
  return useQuery({
    queryKey: cacheKeys.market.transactionHistory(profileId),
    queryFn: async () => {
      return await echoApi.markets.transactionHistory(profileId);
    },
    enabled: Boolean(profileId),
  });
}

export function useMarketHolders(profileId: number) {
  return useQuery({
    queryKey: cacheKeys.market.holders(profileId),
    queryFn: async () => {
      return await echoApi.markets.holders(profileId);
    },
    enabled: Boolean(profileId),
  });
}

export function useMyVotes(profileId: number) {
  const { blockchainManager } = useBlockchainManager();
  const { connectedAddress = zeroAddress } = useCurrentUser();

  return useQuery({
    queryKey: cacheKeys.market.userVotes(profileId, connectedAddress ?? ''),
    queryFn: async () => {
      const votes = await blockchainManager.reputationMarket.getUserVotes(
        connectedAddress,
        profileId,
      );

      return {
        trustVotes: votes.trustVotes.toString(),
        distrustVotes: votes.distrustVotes.toString(),
      };
    },
  });
}

export function useSimulatedTransaction(
  args:
    | {
        action: 'Buy';
        profileId: number;
        isPositive: boolean;
        amount: number;
        funds: bigint;
      }
    | {
        action: 'Sell';
        profileId: number;
        isPositive: boolean;
        amount: number;
        address?: Address | null;
      },
) {
  const { blockchainManager } = useBlockchainManager();

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey:
      args.action === 'Buy'
        ? [SIMULATE_BUY_KEY, args.action, args.isPositive, args.amount, args.funds.toString()]
        : [SIMULATE_SELL_KEY, args.profileId, args.isPositive, args.amount],
    queryFn: async () => {
      let votes: bigint;
      let newPrice: bigint;
      let newFunds: bigint;
      try {
        if (args.action === 'Buy') {
          const { profileId, isPositive, amount, funds } = args;
          const { votesBought, newVotePrice, fundsPaid } =
            await blockchainManager.reputationMarket.simulateBuy(
              profileId,
              isPositive,
              amount,
              funds,
            );
          newPrice = newVotePrice;
          votes = votesBought;
          newFunds = fundsPaid;
        } else {
          const { profileId, isPositive, amount, address } = args;
          const { votesSold, newVotePrice, fundsReceived } =
            await blockchainManager.reputationMarket.simulateSell(
              profileId,
              isPositive,
              amount,
              address ?? zeroAddress,
            );
          votes = votesSold;
          newPrice = newVotePrice;
          newFunds = fundsReceived;
        }

        return {
          action: args.action,
          votes,
          newPrice,
          funds: newFunds,
        };
      } catch (error) {
        if (error instanceof Error) {
          return { error: error.message };
        }

        return { error: 'Unexpected error' };
      }
    },
    enabled: args.profileId > 0 && (args.action === 'Buy' || Boolean(args.address)),
  });
}

/* WRITE / MUTATION HOOKS */

export function useCreateMarket() {
  const { blockchainManager } = useBlockchainManager();
  const queryClient = useQueryClient();
  const { connectedAddress } = useCurrentUser();

  return useWithTxMutation({
    mutationFn: async ({ profileId, value }: { profileId: number; value: bigint }) =>
      await blockchainManager.reputationMarket.createMarket(profileId, value),
    async onSuccess(_, { profileId }) {
      invalidate(queryClient, cacheKeysFor.MarketChange(profileId, connectedAddress ?? ''));
    },
  });
}

export function useBuyVotes() {
  const { blockchainManager } = useBlockchainManager();
  const queryClient = useQueryClient();
  const { connectedAddress } = useCurrentUser();

  return useWithTxMutation({
    mutationFn: async ({
      profileId,
      isPositive,
      value,
      maxVotes,
    }: {
      profileId: number;
      isPositive: boolean;
      value: bigint;
      maxVotes: number | bigint;
    }) => await blockchainManager.reputationMarket.buyVotes(profileId, isPositive, value, maxVotes),
    async onSuccess(_, { profileId }) {
      invalidate(queryClient, cacheKeysFor.MarketChange(profileId, connectedAddress ?? ''));
    },
  });
}

export function useSellVotes() {
  const { blockchainManager } = useBlockchainManager();
  const queryClient = useQueryClient();
  const { connectedAddress } = useCurrentUser();

  return useWithTxMutation({
    mutationFn: async ({
      profileId,
      isPositive,
      amount,
    }: {
      profileId: number;
      isPositive: boolean;
      amount: number;
    }) => await blockchainManager.reputationMarket.sellVotes(profileId, isPositive, amount),
    async onSuccess(_, { profileId }) {
      invalidate(queryClient, cacheKeysFor.MarketChange(profileId, connectedAddress ?? ''));
    },
  });
}

/* Admin Only Hooks */
export function useSetMarketCreationAllowed() {
  const { blockchainManager } = useBlockchainManager();

  return useWithTxMutation({
    mutationFn: async ({ profileId, isAllowed }: { profileId: number; isAllowed: boolean }) => {
      return await blockchainManager.reputationMarket.setIsProfileAllowedToCreateMarket(
        profileId,
        isAllowed,
      );
    },
  });
}

export function useIsMarketCreationAllowed(profileId?: number) {
  const { blockchainManager } = useBlockchainManager();

  return useQuery({
    queryKey: cacheKeys.market.info(profileId ?? 0),
    queryFn: async () => {
      const result = await blockchainManager.reputationMarket.getIsProfileAllowedToCreateMarket(
        profileId ?? 0,
      );

      return result;
    },
    enabled: Boolean(profileId),
    refetchInterval: 0,
    staleTime: 0,
  });
}
