import { useQuery } from '@tanstack/react-query';
import { type Address } from 'viem';
import { useBlockchainManager } from '../../contexts/blockchain-manager.context';
import { useWithTxMutation } from 'hooks/api/blockchain-manager/useWithTxMutation';

/* Admin Only Hooks */

export function useMarketConfigs() {
  const { blockchainManager } = useBlockchainManager();

  return useQuery({
    queryKey: ['market-configs'],
    queryFn: async () => await blockchainManager.reputationMarket.getMarketConfigs(),
  });
}

export function useCreateMarket() {
  const { blockchainManager } = useBlockchainManager();

  return useWithTxMutation({
    mutationFn: async ({
      ownerAddress,
      configIndex,
      initialLiquidity,
    }: {
      ownerAddress: Address;
      configIndex: number;
      initialLiquidity: bigint;
    }) =>
      await blockchainManager.reputationMarket.createMarketWithConfigAdmin(
        ownerAddress,
        configIndex,
        initialLiquidity,
      ),
  });
}

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
    queryKey: ['market-creation', profileId],
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
