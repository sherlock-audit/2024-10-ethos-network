import { formatEther } from 'viem';

export function weiToUsd(wei: bigint, exchangeRate: number) {
  const ether = Number(formatEther(wei));

  return ether * exchangeRate;
}
