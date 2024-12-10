import { capitalize } from '@ethos/helpers';
import { Button, Flex, Typography } from 'antd';
import { motion, type Variants } from 'motion/react';

import { CheckIcon } from '~/components/icons/check.tsx';
import { CloseIcon } from '~/components/icons/close.tsx';
import { lightTheme } from '~/config/theme.ts';
import { useTransactionForm } from '~/routes/market.$id/transaction-context.tsx';

const variants: Variants = {
  hidden: { opacity: 0, y: '100%' },
  visible: {
    opacity: 1,
    y: 0,
  },
};

export function TransactionSuccess() {
  const { state, setState } = useTransactionForm();

  return (
    <motion.div
      className="fixed inset-0 z-[60] bg-antd-colorSuccess flex items-center justify-center"
      style={{ color: lightTheme.token?.colorBgElevated }}
      variants={variants}
      transition={{ duration: 0.3, bounce: 0, ease: 'easeInOut' }}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <Button
        type="text"
        icon={<CloseIcon />}
        className="absolute top-3 right-3 text-inherit"
        onClick={() => {
          setState({ isTransactDrawerOpen: false });
        }}
      />
      <Flex vertical gap={16} className="flex items-center">
        <CheckIcon className="text-7xl text-inherit" />
        <Typography.Title className="text-7xl text-inherit">Success</Typography.Title>
        <Typography.Text className="text-base text-inherit font-plex">
          {state.action === 'buy' ? `${state.buyAmount}e` : state.sellAmount}{' '}
          {capitalize(state.voteType)} {state.action === 'buy' ? 'bought' : 'sold'}
        </Typography.Text>
      </Flex>
    </motion.div>
  );
}
