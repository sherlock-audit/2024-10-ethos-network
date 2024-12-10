import { toNumber } from '@ethos/helpers';
import { VoteBalance } from '../components/balance.component.tsx';
import { useSellSimulationImpact, useSellSubmit } from '../hooks/use-sell.ts';
import { useValidateSellAmount } from '../hooks/use-validate-amount.ts';
import { KeypadForm } from './keypad-form.component.tsx';
import { type InputKey } from './numeric-keypad.component.tsx';
import { useTransactionForm } from '~/routes/market.$id/transaction-context.tsx';

export function MobileSellForm() {
  const { setState, state } = useTransactionForm();
  const { sellVotes, myOwnedVotes } = useSellSubmit();
  const { trend, formattedImpact } = useSellSimulationImpact();
  const votesToSell = toNumber(
    state.voteType === 'trust' ? myOwnedVotes?.trustVotes : myOwnedVotes?.distrustVotes,
  );
  const { validationError } = useValidateSellAmount({ votesToSell });
  const { sellAmount } = state;

  function handleNumberInput(value: InputKey) {
    if (value === '.') {
      return;
    }
    if (value === 'delete') {
      setState({
        sellAmount: Number(sellAmount.toString().slice(0, -1) || '0'),
      });

      return;
    }
    if (sellAmount === 0) {
      setState({
        sellAmount: Number(value),
      });

      return;
    }

    const newValue = sellAmount.toString() + value;
    const numValue = Number(newValue);

    if (Number.isInteger(numValue)) {
      setState({
        sellAmount: Number(newValue),
      });
    }
  }

  function handlePercentage(percentage: number) {
    const amount = Math.floor((votesToSell * percentage) / 100);
    setState({
      sellAmount: amount,
    });
  }

  return (
    <KeypadForm
      handleNumberInput={handleNumberInput}
      handlePercentage={handlePercentage}
      onSubmit={sellVotes}
      validationError={validationError}
      value={sellAmount.toString()}
      impactTrend={trend}
      formattedImpact={formattedImpact}
      balanceInfo={<VoteBalance />}
    />
  );
}
