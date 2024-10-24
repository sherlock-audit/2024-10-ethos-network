/**
 * On the front-end we use RainbowKit to connect to blockchain. Under the hood
 * it uses viem and wagmi. But our BlockchainManager uses ethers.js. This
 * utility helps to convert a RainbowKit client to an ethers.js provider or signer.
 *
 * While on desktop, we could just pass `window.ethereum` to ethers.js, it
 * doesn't work like this on mobile because there's no browser extension that
 * could inject it. That's why we need this conversion.
 *
 * Docs: https://wagmi.sh/react/guides/ethers
 */

import { notEmpty } from '@ethos/helpers';
import { getClient } from '@wagmi/core';
import { BrowserProvider, FallbackProvider, JsonRpcProvider, JsonRpcSigner } from 'ethers';
import { useMemo } from 'react';
import { type Chain, type Transport, type Client, type Account } from 'viem';
import { useClient, useConnectorClient } from 'wagmi';
import { rainbowkitConfig } from 'utils/auth/wallet-connection';

const chainId = rainbowkitConfig.chains[0].id;

function clientToProvider(client: Client<Transport, Chain>) {
  const { chain, transport } = client;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };

  if (transport.type === 'fallback') {
    const providers = (transport.transports as Array<ReturnType<Transport>>)
      .map(({ value }) =>
        typeof value?.url === 'string' ? new JsonRpcProvider(value.url, network) : null,
      )
      .filter(notEmpty);

    if (providers.length === 1) {
      return providers[0];
    }

    return new FallbackProvider(providers);
  }

  if (typeof transport.url !== 'string') {
    throw new Error('Transport url is required');
  }

  return new JsonRpcProvider(transport.url, network);
}

function clientToSigner(client: Client<Transport, Chain, Account>) {
  const { account, chain, transport } = client;

  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  const provider = new BrowserProvider(transport, network);
  const signer = new JsonRpcSigner(provider, account.address);

  return signer;
}

/**
 * Build viem Client from a RainbowKit config, and convert it to an ethers.js
 * Provider (for reading from blockchain)
 */
export function getEthersProvider() {
  const client = getClient(rainbowkitConfig, { chainId });

  if (!client) return;

  return clientToProvider(client);
}

/**
 * Hook to convert a viem Client to an ethers.js Provider (for reading from blockchain)
 */
export function useEthersProvider() {
  const client = useClient();

  return useMemo(() => (client ? clientToProvider(client) : undefined), [client]);
}

/**
 * Hook to convert a Viem Client to an ethers.js Signer (for writing to blockchain)
 */
export function useEthersSigner() {
  const { data: client } = useConnectorClient();

  return useMemo(() => (client ? clientToSigner(client) : undefined), [client]);
}
