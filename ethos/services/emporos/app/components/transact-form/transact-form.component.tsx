import { Flex, Tabs, type TabsProps } from 'antd';
import { BuyTab } from './buy-tab.component.tsx';
import { TransactionErrorNotifications } from './components/error-notification.component.tsx';
import { SellTab } from './sell-tab.component.tsx';
import { SlippageCog } from './slippage-cog.component.tsx';
import { useTransactionForm } from '~/routes/market.$id/transaction-context.tsx';

export function TransactionForm() {
  const { state, setState } = useTransactionForm();
  const items: TabsProps['items'] = [
    {
      key: 'buy',
      label: 'Buy',
      children: <BuyTab />,
    },
    {
      key: 'sell',
      label: 'Sell',
      children: <SellTab />,
    },
  ];

  return (
    <>
      <TransactionErrorNotifications />
      <Flex
        vertical
        justify="left"
        gap={6}
        className="bg-antd-colorBgContainer rounded-lg py-3 px-4"
      >
        <Tabs
          activeKey={state.action}
          tabBarExtraContent={<SlippageCog />}
          items={items}
          onTabClick={(key) => {
            if (key !== state.action) {
              setState({
                action: key as 'buy' | 'sell',
              });
            }
          }}
        />
      </Flex>
    </>
  );
}
