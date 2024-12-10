import { signatures } from '@ethos/domain';
import { extractEchoErrorMessage } from '@ethos/echo-client';
import { duration } from '@ethos/helpers';
import { usePrivy } from '@privy-io/react-auth';
import { useSmartWallets } from '@privy-io/react-auth/smart-wallets';
import { useMutation } from '@tanstack/react-query';
import { App } from 'antd';
import { useEffect } from 'react';
import { getAddress } from 'viem';
import { createSiweMessage, generateSiweNonce } from 'viem/siwe';
import { useAccount, useSignMessage } from 'wagmi';
import { useRegisterAddress } from '../blockchain-manager';
import { useCurrentUser } from 'contexts/current-user.context';
import { echoApi } from 'services/echo';

const { useApp } = App;

/**
 * Currently works only for registering a smart wallet. It can be extended to
 * registering any wallet.
 */
export function useRegisterSmartWallet() {
  const { chainId } = useAccount();
  const { connectedAddress, connectedProfile } = useCurrentUser();
  const { user } = usePrivy();
  const { client } = useSmartWallets();
  const { signMessageAsync } = useSignMessage();
  const registerAddress = useRegisterAddress();
  const { notification } = useApp();

  const smartWalletAddress = user?.smartWallet ? getAddress(user.smartWallet.address) : undefined;

  const registerSmartWallet = useMutation({
    async mutationFn() {
      // Narrow down types
      if (!connectedAddress || !connectedProfile || !chainId || !smartWalletAddress || !client) {
        return;
      }

      const newWalletMessage = signatures.registerAddress.getNewWalletMessage(connectedAddress);
      const newWalletSignature = await client.signMessage({
        message: newWalletMessage,
      });

      const connectedWalletSiweMessage = createSiweMessage({
        address: connectedAddress,
        chainId,
        domain: window.location.host,
        nonce: generateSiweNonce(),
        uri: window.location.href,
        version: '1',
        expirationTime: new Date(Date.now() + duration(5, 'minute').toMilliseconds()),
        statement: signatures.registerAddress.getConnectedWalletStatement(
          smartWalletAddress,
          newWalletSignature,
        ),
      });

      const connectedWalletSignature = await signMessageAsync({
        message: connectedWalletSiweMessage,
      });

      const { randValue, signature } = await echoApi.signatures.registerAddress({
        connectedWalletSiweMessage,
        connectedWalletSignature,
        newWalletMessage,
        newWalletSignature,
      });

      try {
        await registerAddress.mutateAsync({
          address: smartWalletAddress,
          profileId: connectedProfile.id,
          randValue,
          signature,
        });
      } catch {
        // Handled within mutation
      }
    },
  });

  const { error } = registerSmartWallet;

  useEffect(() => {
    if (!error) return;

    notification.error({
      message: 'Failed to connect smart wallet',
      description: extractEchoErrorMessage(error),
    });
  }, [notification, error]);

  return registerSmartWallet;
}
