import { formatEth } from '@ethos/helpers';
import { useCallback } from 'react';
import { useTransactionForm } from '~/routes/market.$id/transaction-context.tsx';

export function usePercentageToBuyAmount(
  balanceValue: bigint,
  onSuccess?: (amount: number) => void,
) {
  const { setState } = useTransactionForm();
  const convertPercentageToAmount = useCallback(
    (percentage: number) => {
      const basisPoints = BigInt(percentage * 100);
      const calculatedValue = (balanceValue * basisPoints) / BigInt(10000);

      // For max (100%), apply 0.999 multiplier to account for gas
      const finalValue =
        percentage === 100 ? (calculatedValue * BigInt(999)) / BigInt(1000) : calculatedValue;

      const newDisplayValue = formatEth(finalValue, 'wei', {
        maximumFractionDigits: percentage === 100 ? 5 : 4,
        minimumFractionDigits: 0,
      }).replace('e', '');

      setState({
        buyAmount: Number(newDisplayValue),
      });

      onSuccess?.(Number(newDisplayValue));
    },
    [balanceValue, setState, onSuccess],
  );

  return { convertPercentageToAmount };
}
