import { useWallets } from '@privy-io/react-auth';
import { useCallback, useEffect, useState } from 'react';
import { getAddress } from 'viem';
import { useBalance } from 'wagmi';
import { WalletBalance } from '../components/balance.component.tsx';
import { useBuySimulationImpact, useBuySubmit } from '../hooks/use-buy.ts';
import { usePercentageToBuyAmount } from '../hooks/use-percentage-to-amount.ts';
import { useValidateBuyAmount } from '../hooks/use-validate-amount.ts';
import { isValidAmount } from './is-valid-amount.util.ts';
import { KeypadForm } from './keypad-form.component.tsx';
import { type InputKey } from './numeric-keypad.component.tsx';
import { useTransactionForm } from '~/routes/market.$id/transaction-context.tsx';

export function MobileBuyForm() {
  const { setState, state } = useTransactionForm();
  const { buyVotes } = useBuySubmit();
  const { trend, formattedImpact } = useBuySimulationImpact();
  const [displayValue, setDisplayValue] = useState(state.buyAmount.toString());

  const { wallets } = useWallets();
  const { data: balance } = useBalance({
    address: wallets.length > 0 ? getAddress(wallets[0].address) : undefined,
  });
  const { validationError } = useValidateBuyAmount({
    balanceValue: balance?.value,
  });

  function handleNumberInput(value: InputKey) {
    if (displayValue === '0' && value !== '.' && value !== 'delete') {
      setDisplayValue(value);

      return;
    }

    if (value === '.' && displayValue.includes('.')) {
      return;
    }
    if (value === 'delete') {
      setDisplayValue((prev) => prev.slice(0, -1) || '0');

      return;
    }

    const newValue = displayValue + value;

    if (isValidAmount(newValue)) {
      setDisplayValue(newValue);
    }
  }

  const onSuccess = useCallback((amount: number) => {
    setDisplayValue(amount.toString());
  }, []);

  const { convertPercentageToAmount } = usePercentageToBuyAmount(balance?.value ?? 0n, onSuccess);

  useEffect(() => {
    const number = Number(displayValue);

    if (!isNaN(number)) {
      setState({
        buyAmount: number,
      });
    }
  }, [displayValue, setState]);

  return (
    <KeypadForm
      handleNumberInput={handleNumberInput}
      handlePercentage={convertPercentageToAmount}
      onSubmit={buyVotes}
      validationError={validationError}
      value={displayValue}
      impactTrend={trend}
      formattedImpact={formattedImpact}
      balanceInfo={<WalletBalance />}
    />
  );
}
