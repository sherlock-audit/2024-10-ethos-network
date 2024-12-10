import { type EthosUserTarget } from '@ethos/domain';
import { isValidAddress, duration } from '@ethos/helpers';
import { MoralisClient } from '../../../common/net/moralis/moralis.client.js';
import { user } from '../../user/lookup/index.js';
import { type ScoreElementResult } from '../types.js';

const moralisClient = new MoralisClient();

/**
 * Calculates the age of an Ethereum address in days.
 * Uses Moralis to obtain the first transaction for the address across all chains.
 * @param address The Ethereum address to calculate the age for.
 * @returns A Promise that resolves to the age of the address in days.
 */
export async function ethereumAddressAge(target: EthosUserTarget): Promise<ScoreElementResult> {
  // TODO - this should be memoized and cached
  const INSUFFICIENT_DATA = { score: 0, metadata: { insufficientData: 1 } };

  const address = await user.getPrimaryAddress(target);

  if (!address || !isValidAddress(address)) return INSUFFICIENT_DATA;

  const firstTransactionTimestamp = await moralisClient.getFirstTransactionTimestamp(address);

  if (!firstTransactionTimestamp?.getTime()) return INSUFFICIENT_DATA;

  const score = Math.floor(
    (Date.now() - firstTransactionTimestamp.getTime()) / duration(1, 'day').toMilliseconds(),
  );

  return { score, metadata: { firstTransaction: firstTransactionTimestamp.getTime() } };
}
