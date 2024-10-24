import { duration, formatCurrency } from '@ethos/helpers';
import { useQuery } from '@tanstack/react-query';
import { formatEther } from 'viem';
import { cacheKeys } from 'constant/queries/queries.constant';
import { echoApi } from 'services/echo';

function useETHToUsdRate() {
  return useQuery({
    queryKey: cacheKeys.eth.to('usd'),
    queryFn: async () => {
      try {
        return await echoApi.exchangeRates.getEthPriceInUSD();
      } catch (err) {
        console.error('Error getting eth price in USD', err);

        return null;
      }
    },
    staleTime: duration(30, 'minutes').toMilliseconds(),
  });
}

/**
 * Converts an amount of ETH to its equivalent value in USD.
 *
 * @param {string | number} amount - The amount of ETH to convert.
 * @returns {string | null} The equivalent value in USD as a formatted currency string,
 *                          '...' if the rate is still loading, or null if there's an error.
 */

export function useEthToUSD(amount: string | number): string | null {
  const { data, isPending, error } = useETHToUsdRate();

  if (error) {
    return null;
  }

  if (!isPending && !data) {
    return null;
  }

  if (isPending || !data?.price) {
    return '...';
  }

  const ether = Number(amount);

  return formatCurrency(ether * data.price, 'USD');
}

export function useWeiToUSD(amount: bigint) {
  const ether = Number(formatEther(amount));

  return useEthToUSD(ether);
}
