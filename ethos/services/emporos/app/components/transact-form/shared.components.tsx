import { Segmented, type SegmentedProps } from 'antd';
import { ThumbsDownOutlinedIcon, ThumbsUpOutlinedIcon } from '../icons/thumbs.tsx';
import { useTransactionForm } from '~/routes/market.$id/transaction-context.tsx';

export function TrustButtons() {
  const { state, setState } = useTransactionForm();
  const { market } = state;
  const options: SegmentedProps['options'] = [
    {
      label: (
        <span className="text-trust">
          <ThumbsUpOutlinedIcon /> Yes {Math.round(market.stats.trustPercentage)}%
        </span>
      ),
      value: 'trust',
    },
    {
      label: (
        <span className="text-distrust">
          <ThumbsDownOutlinedIcon /> No {Math.round(100 - market.stats.trustPercentage)}%
        </span>
      ),
      value: 'distrust',
    },
  ];

  return (
    <Segmented
      options={options}
      block
      size="large"
      value={state.voteType}
      onChange={(value) => {
        setState({ voteType: value as 'trust' | 'distrust' });
      }}
    />
  );
}
