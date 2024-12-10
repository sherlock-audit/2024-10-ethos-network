import { useSearchParams } from 'react-router-dom';

export const QueryParamKeys = {
  action: 'action',
  voteType: 'voteType',
  transact: 'transact',
  sellAmount: 'sellAmount',
  buyAmount: 'buyAmount',
  slippageBp: 'slippageBp',
} as const;

export function useTransactSearchParams() {
  const [searchParams] = useSearchParams();

  const buyAmount = searchParams.get(QueryParamKeys.buyAmount);
  const sellAmount = searchParams.get(QueryParamKeys.sellAmount);
  const action: 'sell' | 'buy' =
    searchParams.get(QueryParamKeys.action) === 'sell' ? 'sell' : 'buy';
  const voteType: 'trust' | 'distrust' =
    searchParams.get(QueryParamKeys.voteType) === 'distrust' ? 'distrust' : 'trust';
  const transact = Boolean(searchParams.get(QueryParamKeys.transact));
  const slippageBp = Number(searchParams.get(QueryParamKeys.slippageBp));

  return {
    action,
    voteType,
    transact,
    sellAmount: sellAmount ? Number(sellAmount) : null,
    buyAmount: buyAmount ? Number(buyAmount) : null,
    slippageBp,
  };
}
