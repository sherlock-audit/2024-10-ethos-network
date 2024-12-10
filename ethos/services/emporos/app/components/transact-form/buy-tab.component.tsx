import { useWallets } from '@privy-io/react-auth';
import { Flex, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { getAddress } from 'viem';
import { useBalance } from 'wagmi';
import { WalletBalance } from './components/balance.component.tsx';
import { ConvenienceButtons } from './components/convenience-buttons.component.tsx';
import { ErrorMessage } from './components/error-message.component.tsx';
import { TransactInput } from './components/transact-input.component.tsx';
import { TrustScore } from './components/trust-score.component.tsx';
import { useBuySimulationImpact, useBuySubmit } from './hooks/use-buy.ts';
import { usePercentageToBuyAmount } from './hooks/use-percentage-to-amount.ts';
import { useValidateBuyAmount } from './hooks/use-validate-amount.ts';
import { TrustButtons } from './shared.components.tsx';
import { TransactButton } from './transact-button.tsx';
import { useTransactionForm } from '~/routes/market.$id/transaction-context.tsx';

export function BuyTab() {
  const { state, setState } = useTransactionForm();
  const [displayValue, setDisplayValue] = useState(state.buyAmount.toString());
  const { buyVotes } = useBuySubmit();

  const { wallets } = useWallets();
  const { data: balance } = useBalance({
    address: wallets.length > 0 ? getAddress(wallets[0].address) : undefined,
  });

  const { validationError } = useValidateBuyAmount({
    balanceValue: balance?.value,
  });

  const onSuccess = useCallback((amount: number) => {
    setDisplayValue(amount.toString());
  }, []);

  useEffect(() => {
    const number = Number(displayValue);

    if (!isNaN(number)) {
      setState({ buyAmount: number });
    }
  }, [displayValue, setState]);

  const { trend, formattedImpact } = useBuySimulationImpact();
  const { convertPercentageToAmount } = usePercentageToBuyAmount(balance?.value ?? 0n, onSuccess);

  return (
    <Flex vertical gap={16}>
      <Flex vertical gap={8}>
        <Typography.Text className="text-sm">Trust voting</Typography.Text>
        <TrustButtons />
      </Flex>
      <Flex vertical gap={8}>
        <WalletBalance className="bg-antd-colorBgLayout" />
        <Flex justify="center" align="center">
          <TransactInput
            value={displayValue}
            onChange={(value) => {
              setDisplayValue(value as string);
            }}
            type="number"
            min="0.001"
            step="0.001"
          />
          <Typography.Text className="text-antd-colorText text-3xl font-plex">e</Typography.Text>
        </Flex>
        <TrustScore
          impactTrend={trend}
          formattedImpact={formattedImpact}
          className="justify-center mb-1"
        />
        <ErrorMessage errorMessage={validationError} />
      </Flex>
      <ConvenienceButtons handlePercentage={convertPercentageToAmount} />
      <Flex justify="center" align="center" gap={6} vertical>
        <TransactButton onClick={buyVotes} label="Buy" />
        <Typography.Text className="text-antd-colorTextSecondary text-sm text-center">
          1% fee
        </Typography.Text>
      </Flex>
    </Flex>
  );
}
