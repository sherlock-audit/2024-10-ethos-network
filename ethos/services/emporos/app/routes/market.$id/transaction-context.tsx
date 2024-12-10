import { createContext, type PropsWithChildren, useCallback, useContext, useState } from 'react';
import { useTransactSearchParams } from '~/components/transact-form/params.tsx';
import { type MarketWithStats } from '~/types/markets.ts';

const DEFAULT_BUY_AMOUNT = 0.1;
const DEFAULT_SLIPPAGE_BASIS_POINTS = 10;
const DEFAULT_SELL_AMOUNT = 1;
const DEFAULT_ACTION = 'buy';
const DEFAULT_VOTE_TYPE = 'trust';

type TransactionFormState = {
  market: MarketWithStats;
  action: 'buy' | 'sell';
  voteType: 'trust' | 'distrust';
  sellAmount: number;
  buyAmount: number;
  isTransactDrawerOpen: boolean;
  transactionState: 'initial' | 'pending' | 'success' | 'error';
  transactionError: string | null;
  slippageBasisPoints: number;
};

type TransactionContextType = {
  state: TransactionFormState;
  setState: (state: Partial<TransactionFormState>) => void;
};

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export function TransactionProvider({
  children,
  market,
}: PropsWithChildren<{ market: MarketWithStats }>) {
  const { action, voteType, sellAmount, buyAmount, transact, slippageBp } =
    useTransactSearchParams();
  const [state, setStateInternal] = useState<TransactionFormState>({
    market,
    action: action ?? DEFAULT_ACTION,
    voteType: voteType ?? DEFAULT_VOTE_TYPE,
    sellAmount: sellAmount ?? DEFAULT_SELL_AMOUNT,
    buyAmount: buyAmount ?? DEFAULT_BUY_AMOUNT,
    isTransactDrawerOpen: transact ?? false,
    slippageBasisPoints: slippageBp || DEFAULT_SLIPPAGE_BASIS_POINTS,
    transactionState: 'initial',
    transactionError: null,
  });

  const setState = useCallback((newState: Partial<TransactionFormState>) => {
    setStateInternal((prev) => ({ ...prev, ...newState }));
  }, []);

  return (
    <TransactionContext.Provider value={{ state, setState }}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactionForm() {
  const context = useContext(TransactionContext);

  if (context === undefined) {
    throw new Error('useTransaction must be used within a TransactionProvider');
  }

  return context;
}
