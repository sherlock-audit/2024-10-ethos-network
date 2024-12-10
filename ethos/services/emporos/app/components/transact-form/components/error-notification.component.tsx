import { AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { ToastMessage } from '../../toast-message.tsx';
import { useTransactionForm } from '~/routes/market.$id/transaction-context.tsx';

export function TransactionErrorNotifications({
  placement,
}: {
  placement?: 'bottom-right' | 'bottom-left';
}) {
  const [notification, setNotification] = useState<{
    id: number;
    title: string;
    text: string;
  } | null>(null);
  const { state, setState } = useTransactionForm();

  useEffect(() => {
    if (state.transactionError) {
      setNotification({
        id: Math.random(),
        title: 'Transaction error',
        text: state.transactionError,
      });
      setState({ transactionError: null });
    }
  }, [state.transactionError, setState]);

  const clearNotifications = useCallback(() => {
    setNotification(null);
  }, []);

  return (
    <AnimatePresence>
      {notification && (
        <ToastMessage
          clearNotifications={clearNotifications}
          key={notification.id}
          title={notification.title}
          text={notification.text}
          placement={placement}
        />
      )}
    </AnimatePresence>
  );
}
