import { EllipsisOutlined } from '@ant-design/icons';
import { capitalize } from '@ethos/helpers';
import { type MenuProps, Flex, Button, Dropdown } from 'antd';
import { AnimatePresence } from 'motion/react';
import { useCallback, useMemo } from 'react';
import { useTransactionForm } from './transaction-context.tsx';
import { VaulDrawer } from '~/components/drawer/vaul-drawer.tsx';
import { ThumbsDownFilledIcon, ThumbsUpFilledIcon } from '~/components/icons/thumbs.tsx';
import { MobileBuyForm } from '~/components/transact-form/mobile/mobile-buy-form.component.tsx';
import { MobileSellForm } from '~/components/transact-form/mobile/mobile-sell-form.component.tsx';
import { TransactionSuccess } from '~/components/transact-form/mobile/transaction-success.component.tsx';
import { SlippageCog } from '~/components/transact-form/slippage-cog.component.tsx';
import { lightTheme } from '~/config/theme.ts';
import { useMyVotes } from '~/hooks/market.tsx';

export function TransactionFooter() {
  const { state, setState } = useTransactionForm();
  const { market, action, voteType } = state;
  const { data: myOwnedVotes } = useMyVotes(market.profileId);

  const onButtonClick = useCallback(
    (action: 'buy' | 'sell', voteType: 'trust' | 'distrust') => {
      setState({
        action,
        voteType,
        isTransactDrawerOpen: true,
        transactionState: 'initial',
      });
    },
    [setState],
  );

  const items: MenuProps['items'] = useMemo(() => {
    const menuItems = [];

    if (Number(myOwnedVotes?.trustVotes) > 0) {
      menuItems.push({
        key: 'sell-yes',
        label: 'Sell Yes',
        onClick: () => {
          onButtonClick('sell', 'trust');
        },
      });
    }

    if (Number(myOwnedVotes?.distrustVotes) > 0) {
      menuItems.push({
        key: 'sell-no',
        label: 'Sell No',
        onClick: () => {
          onButtonClick('sell', 'distrust');
        },
      });
    }

    return menuItems;
  }, [myOwnedVotes, onButtonClick]);

  return (
    <Flex
      justify="space-between"
      className="w-full fixed bottom-[calc(calc(env(safe-area-inset-bottom)/2)+100px)] left-0 right-0 md:hidden py-0 px-2 xs:px-4 bg-transparent gap-2 xs:gap-4"
    >
      <Button
        className="bg-trust w-full shadow-floatButton"
        style={{
          color: lightTheme.token?.colorBgContainer,
        }}
        variant="filled"
        size="large"
        icon={<ThumbsUpFilledIcon />}
        onClick={() => {
          onButtonClick('buy', 'trust');
        }}
      >
        Buy Yes {Math.round(market.stats.trustPercentage)}%
      </Button>
      <Button
        className="bg-distrust w-full shadow-floatButton"
        style={{
          color: lightTheme.token?.colorBgContainer,
        }}
        variant="filled"
        size="large"
        icon={<ThumbsDownFilledIcon />}
        onClick={() => {
          onButtonClick('buy', 'distrust');
        }}
      >
        Buy No {Math.round(100 - market.stats.trustPercentage)}%
      </Button>
      {items.length > 0 && (
        <Dropdown menu={{ items }} placement="topRight">
          <Button
            icon={<EllipsisOutlined />}
            size="large"
            className="min-w-8 shadow-floatButton bg-antd-colorBgElevated"
          />
        </Dropdown>
      )}
      <VaulDrawer
        title={`${capitalize(action)} ${capitalize(voteType)} in ${market.name}`}
        titleSuffix={<SlippageCog />}
        open={state.isTransactDrawerOpen}
        className="md:hidden overflow-hidden"
        showCloseButton={false}
        contentCentered={true}
        headerContent={
          <AnimatePresence>
            {state.transactionState === 'success' && <TransactionSuccess />}
          </AnimatePresence>
        }
        onClose={() => {
          setState({ isTransactDrawerOpen: false });
        }}
      >
        {action === 'buy' ? <MobileBuyForm /> : <MobileSellForm />}
      </VaulDrawer>
    </Flex>
  );
}
