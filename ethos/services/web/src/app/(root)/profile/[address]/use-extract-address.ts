import { isValidAddress, isValidEnsName } from '@ethos/helpers';
import { notFound } from 'next/navigation';
import { useMemo } from 'react';
import { zeroAddress } from 'viem';
import { useEnsDetailsByName } from 'hooks/api/echo.hooks';

/**
 * Hook to extract and validate an Ethereum address from a string input.
 * @param address - The input string, which can be an Ethereum address or ENS name.
 * @returns An object containing the extracted address and ENS data loading state.
 * @throws Redirects to Not Found page if the input is invalid.
 */

export function useExtractAddress(address: string) {
  const { data: ensData } = useEnsDetailsByName(isValidEnsName(address) ? address : '');

  const extractedAddress = useMemo(() => {
    if (isValidAddress(ensData?.address)) {
      return ensData.address;
    }

    if (isValidEnsName(address) && !ensData) {
      // return zero address to avoid redirect while we fetch the ENS data
      return zeroAddress;
    }
    if (isValidAddress(address)) {
      return address;
    }

    notFound();
  }, [address, ensData]);

  return { address: extractedAddress };
}
