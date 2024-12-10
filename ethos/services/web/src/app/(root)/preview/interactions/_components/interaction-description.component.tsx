import { InteractionOutlined, TransactionOutlined } from '@ant-design/icons';
import { type Relationship } from '@ethos/domain';
import { Typography } from 'antd';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { useState } from 'react';
import { ViewTxn } from 'app/(root)/activity/_components/view.txn.component';

const SHOW_MORE_AMOUNT = 2;

export function InteractionDescription({ relationship }: { relationship: Relationship }) {
  const [showAll, setShowAll] = useState(false);
  const { transactions } = relationship;

  if (transactions.length === 0) {
    return (
      <>
        <InteractionOutlined /> No transactions
      </>
    );
  }

  const displayedTransactions = showAll ? transactions : transactions.slice(0, SHOW_MORE_AMOUNT);

  return (
    <>
      {displayedTransactions.map((transaction, index) => (
        <div key={transaction.hash}>
          <TransactionOutlined /> {transaction.summary.split(' to')[0]}{' '}
          <ViewTxn txnHash={transaction.hash} chain="unknown" />
          {index < displayedTransactions.length - 1 && <br />}
        </div>
      ))}
      {transactions.length > SHOW_MORE_AMOUNT && !showAll && (
        <Typography.Link
          onClick={() => {
            setShowAll(true);
          }}
        >
          Show {transactions.length - SHOW_MORE_AMOUNT} more
        </Typography.Link>
      )}
    </>
  );
}
