import { BlockchainManager } from '@ethos/blockchain-manager';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { getEthersProvider, useEthersProvider, useEthersSigner } from './client-to-ethers.util';
import { useCurrentUser } from './current-user.context';
import { getEnvironment } from 'config';

type BlockchainManagerContextType = {
  blockchainManager: BlockchainManager;
  /**
   * Indicates if the address is connected, allowing write operations through
   * the BlockchainManager.
   */
  initializedWithSigner: boolean;
};

const initialBlockchainManager = new BlockchainManager(getEnvironment(), {
  provider: getEthersProvider(),
});

const BlockchainManagerContext = createContext<BlockchainManagerContextType>({
  blockchainManager: initialBlockchainManager,
  initializedWithSigner: false,
});

export function BlockchainManagerProvider({ children }: PropsWithChildren) {
  const { connectedAddress } = useCurrentUser();
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
    new BlockchainManager(getEnvironment(), options),
  );

  useEffect(() => {
    const newBlockchainManager = new BlockchainManager(getEnvironment(), options);
    setBlockchainManager(newBlockchainManager);
  }, [connectedAddress, options]);

  return (
    <BlockchainManagerContext.Provider
      value={{ blockchainManager, initializedWithSigner: Boolean(connectedAddress) }}
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
