import { SettingOutlined } from '@ant-design/icons';
import { Button, Flex, Popover, Segmented, Typography } from 'antd';
import { type SegmentedOptions } from 'antd/es/segmented/index';
import { useTransactionForm } from '~/routes/market.$id/transaction-context.tsx';

export function SlippageCog() {
  const { state, setState } = useTransactionForm();
  const options: SegmentedOptions<number> = [
    { label: '0.1%', value: 10 },
    { label: '0.5%', value: 50 },
    { label: '1%', value: 100 },
  ];

  return (
    <Popover
      trigger="click"
      placement="left"
      // Without this, switching segments inside the VaulDrawer isn't working
      getPopupContainer={(triggerNode) => triggerNode.parentElement ?? document.body}
      content={
        <Flex vertical align="center" gap={10} className="max-w-[200px]">
          <Typography.Text>
            Your transaction will revert if the price changes unfavorably by this percentage.
          </Typography.Text>
          <Segmented
            options={options}
            value={state.slippageBasisPoints}
            onChange={(value) => {
              setState({ slippageBasisPoints: value });
            }}
          />
        </Flex>
      }
    >
      <Button icon={<SettingOutlined />} type="text" />
    </Popover>
  );
}
