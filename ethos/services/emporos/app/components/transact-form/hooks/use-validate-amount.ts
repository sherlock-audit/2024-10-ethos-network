import { useCallback, useEffect, useState } from 'react';
import { parseEther } from 'viem';
import { useTransactionForm } from '~/routes/market.$id/transaction-context.tsx';

export function useValidateBuyAmount({ balanceValue }: { balanceValue: bigint | undefined }) {
  const { state } = useTransactionForm();
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateAmount = useCallback(
    (amount: string) => {
      try {
        const amountInWei = parseEther(amount, 'wei');

        if (!balanceValue) {
          setValidationError('You have no balance');
        } else if (amountInWei > balanceValue) {
          setValidationError('Insufficient balance');
        } else if (amountInWei < BigInt(1e15)) {
          // 0.001 in wei
          setValidationError('Min amount is 0.001');
        } else {
          setValidationError(null);
        }
      } catch (e) {
        setValidationError('Invalid amount');
      }
    },
    [balanceValue],
  );

  useEffect(() => {
    validateAmount(state.buyAmount.toString());
  }, [state.buyAmount, validateAmount]);

  return { validateAmount, validationError };
}

export function useValidateSellAmount({ votesToSell }: { votesToSell: number | undefined }) {
  const { state } = useTransactionForm();
  const [validationError, setValidationError] = useState<string | null>(null);
  const validateAmount = useCallback(
    (amount: string) => {
      const numAmount = Number(amount);

      if (!votesToSell) {
        setValidationError('You have no votes');
      } else if (!Number.isInteger(numAmount) || numAmount < 1) {
        setValidationError('Minimum is 1 vote');
      } else if (numAmount > votesToSell) {
        setValidationError('Insufficient votes');
      } else {
        setValidationError(null);
      }
    },
    [votesToSell],
  );

  useEffect(() => {
    validateAmount(state.sellAmount.toString());
  }, [state.sellAmount, validateAmount]);

  return { validateAmount, validationError, setValidationError };
}
