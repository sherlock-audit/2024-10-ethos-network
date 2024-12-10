import { toNumber } from '@ethos/helpers';
import { Flex, Typography } from 'antd';
import { VoteBalance } from './components/balance.component.tsx';
import { ConvenienceButtons } from './components/convenience-buttons.component.tsx';
import { ErrorMessage } from './components/error-message.component.tsx';
import { TransactInput } from './components/transact-input.component.tsx';
import { TrustScore } from './components/trust-score.component.tsx';
import { useSellSimulationImpact, useSellSubmit } from './hooks/use-sell.ts';
import { useValidateSellAmount } from './hooks/use-validate-amount.ts';
import { TrustButtons } from './shared.components.tsx';
import { TransactButton } from './transact-button.tsx';
import { useTransactionForm } from '~/routes/market.$id/transaction-context.tsx';

export function SellTab() {
  const { state, setState } = useTransactionForm();

  const { sellVotes, myOwnedVotes } = useSellSubmit();
  const { trend, formattedImpact } = useSellSimulationImpact();
  const votesToSell = toNumber(
    state.voteType === 'trust' ? myOwnedVotes?.trustVotes : myOwnedVotes?.distrustVotes,
  );
  const { validationError } = useValidateSellAmount({ votesToSell });

  function handlePercentage(percentage: number) {
    const amount = Math.floor((votesToSell * percentage) / 100);
    setState({ sellAmount: amount });
  }

  return (
    <Flex vertical gap={16}>
      <Flex vertical gap={8}>
        <Typography.Text className="text-sm">Trust voting</Typography.Text>
        <TrustButtons />
      </Flex>
      <Flex vertical gap={8}>
        <VoteBalance className="bg-antd-colorBgLayout" />
        <TransactInput
          value={state.sellAmount.toString()}
          onChange={(value) => {
            setState({ sellAmount: Number(value) });
          }}
          type="number"
          min={0}
          step={1}
        />
        <TrustScore
          impactTrend={trend}
          formattedImpact={formattedImpact}
          className="justify-center mb-1"
        />
        <ErrorMessage errorMessage={validationError} />
      </Flex>
      <ConvenienceButtons handlePercentage={handlePercentage} />
      <Flex justify="center" align="center" gap={6} vertical>
        <TransactButton onClick={sellVotes} label="Sell" />
        <Typography.Text className="text-antd-colorTextSecondary text-sm text-center">
          1% fee
        </Typography.Text>
      </Flex>
    </Flex>
  );
}
