import { BlockchainManager } from '@ethos/blockchain-manager';
import { type EthosEnvironment } from '@ethos/env';
import { getEmbeddedConnectedWallet, useWallets } from '@privy-io/react-auth';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { useEthersProvider, useEthersSigner } from '~/utils/client-to-ethers.utils.ts';

type BlockchainManagerContextType = {
  blockchainManager: BlockchainManager;
  /**
   * Indicates if the address is connected, allowing write operations through
   * the BlockchainManager.
   */
  initializedWithSigner: boolean;
};

const BlockchainManagerContext = createContext<BlockchainManagerContextType | null>(null);

export function BlockchainManagerProvider({
  children,
  environment,
}: PropsWithChildren<{ environment: EthosEnvironment }>) {
  const { wallets } = useWallets();
  const connectedWallet = getEmbeddedConnectedWallet(wallets);
  const provider = useEthersProvider();
  const signer = useEthersSigner();

  const options = useMemo(
    () => ({
      provider,
      signer,
    }),
    [provider, signer],
  );

  const [blockchainManager, setBlockchainManager] = useState<BlockchainManager>(
    new BlockchainManager(environment, options),
  );

  useEffect(() => {
    const newBlockchainManager = new BlockchainManager(environment, options);
    setBlockchainManager(newBlockchainManager);
  }, [environment, options]);

  return (
    <BlockchainManagerContext.Provider
      value={{ blockchainManager, initializedWithSigner: Boolean(connectedWallet?.address) }}
    >
      {children}
    </BlockchainManagerContext.Provider>
  );
}

export function useBlockchainManager() {
  const context = useContext(BlockchainManagerContext);

  if (!context) {
    throw new Error('useBlockchainManager must be used within a BlockchainManagerProvider');
  }

  return context;
}
