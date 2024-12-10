import { type SetNonNullable } from 'type-fest';
import { type Address, createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';
import { ensDetails } from '../cache/ens.js';
import { config } from '../config.js';

const client = createPublicClient({
  chain: mainnet,
  transport: http(`https://eth-mainnet.g.alchemy.com/v2/${config.ALCHEMY_API_KEY}`),
});

/**
 * Represents ENS details with loose typing, allowing for null address.
 */

export type EnsDetailsLoose = {
  name: string | null;
  avatar: string | null;
  address: Address | null;
};

/**
 * Represents ENS details with strict typing, ensuring the address is always present.
 */

export type EnsDetailsStrict = SetNonNullable<EnsDetailsLoose, 'address'>;

export async function getDetailsByAddress(address: Address): Promise<EnsDetailsStrict> {
  const cached = await ensDetails.getByAddress(address);

  if (cached) return cached;

  const name = await client.getEnsName({ address });
  const avatar = name ? await client.getEnsAvatar({ name: normalize(name) }) : null;

  await ensDetails.set({ avatar, name, address });

  return { avatar, name, address };
}

export async function getDetailsByName(ensName: string): Promise<EnsDetailsLoose | null> {
  const cached = await ensDetails.getByName(ensName);

  if (cached) return cached;

  const address = await client.getEnsAddress({ name: ensName });

  if (address) {
    const avatar = await client.getEnsAvatar({ name: ensName });
    await ensDetails.set({ name: ensName, avatar, address });

    return { avatar, name: ensName, address };
  }

  return null;
}
