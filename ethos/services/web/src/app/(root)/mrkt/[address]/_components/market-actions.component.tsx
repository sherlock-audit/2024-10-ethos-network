import { SettingOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { type ProfileId } from '@ethos/blockchain-manager';
import { formatEth } from '@ethos/helpers';
import {
  Button,
  Card,
  Flex,
  InputNumber,
  Tabs,
  Typography,
  Row,
  Col,
  Skeleton,
  Badge,
  Popover,
  Segmented,
} from 'antd';
import { type SegmentedOptions } from 'antd/es/segmented';
import { useEffect, useState } from 'react';
import { parseEther } from 'viem';
import { tokenCssVars } from 'config';
import { useCurrentUser } from 'contexts/current-user.context';
import {
  votePriceToPercentage,
  useBuyVotes,
  useSellVotes,
  useMyVotes,
  useSimulatedTransaction,
} from 'hooks/market/market.hooks';
import { useDebouncedValue } from 'hooks/useDebounce';
import { type echoApi } from 'services/echo';

const DEFAULT_SLIPPAGE_BASIS_POINTS = 10;
const ToggleButton = ({
  type,
  isSelected,
  price,
  onClick,
}: {
  type: 'Trust' | 'Distrust';
  isSelected: boolean;
  onClick: () => void;
  price: string;
}) => (
  <Button
    type={isSelected ? 'primary' : 'default'}
    css={css`
      width: 100%;
      ${isSelected &&
      `
        background-color: ${type === 'Trust' ? tokenCssVars.colorSuccess : tokenCssVars.colorError};
        color: #ffffff;
      `}
      ${!isSelected &&
      `
        background-color: transparent;
        color: ${type === 'Trust' ? tokenCssVars.colorSuccess : tokenCssVars.colorError};
        border: 1px solid ${type === 'Trust' ? tokenCssVars.colorSuccess : tokenCssVars.colorError};
      `}
    `}
    onClick={onClick}
  >
    {type} {price}
  </Button>
);

type ActionPanelProps = {
  action: 'Buy' | 'Sell';
  isLoading: boolean;
  slippageBasisPoints: number;
  market?: Awaited<ReturnType<typeof echoApi.markets.info>>;
  onActionTaken: () => void;
};
const ActionPanel = ({
  action,
  isLoading,
  slippageBasisPoints,
  market,
  onActionTaken,
}: ActionPanelProps) => {
  const { connectedAddress } = useCurrentUser();
  const { data: myVotes } = useMyVotes(market?.profileId ?? 0);
  const [funds, setFunds] = useState<number>(0.1);
  const [sellVotes, setSellVotes] = useState<number>(0);
  const [selectedType, setSelectedType] = useState<'Trust' | 'Distrust'>('Trust');

  const debouncedFunds = useDebouncedValue(funds, 500);
  const debouncedSellVotes = useDebouncedValue(sellVotes, 500);
  const debouncedSelectedType = useDebouncedValue(selectedType, 550);

  const { data: simulationResult } = useSimulatedTransaction({
    action,
    profileId: market?.profileId ?? 0,
    isPositive: debouncedSelectedType === 'Trust',
    funds: parseEther(debouncedFunds.toString()),
    sellVotes: debouncedSellVotes,
    address: connectedAddress,
  });

  useEffect(() => {
    if (action === 'Sell') {
      const maxAllowed = selectedType === 'Trust' ? myVotes?.trustVotes : myVotes?.distrustVotes;
      setSellVotes(Math.min(Number(maxAllowed ?? 0), sellVotes));
    }
  }, [action, myVotes?.trustVotes, myVotes?.distrustVotes, sellVotes, selectedType]);

  if (isLoading) {
    return (
      <Flex gap={10} vertical>
        <Skeleton.Input css={{ width: '100%' }} active />
        <Skeleton.Button active block />
        <Skeleton.Button active block />
        <Skeleton.Input css={{ width: '100%' }} active />
        <Skeleton.Button active block />
      </Flex>
    );
  }

  if (!market) {
    return <Typography.Text>This person has not created a reputation market yet.</Typography.Text>;
  }
  const { positivePrice, negativePrice } = market;

  return (
    <Flex gap={10} vertical>
      <Row gutter={[8, 8]}>
        <Col span={12}>
          <ToggleButton
            type="Trust"
            isSelected={selectedType === 'Trust'}
            price={votePriceToPercentage(BigInt(positivePrice))}
            onClick={() => {
              setSelectedType('Trust');
            }}
          />
        </Col>
        <Col span={12}>
          <ToggleButton
            type="Distrust"
            isSelected={selectedType === 'Distrust'}
            price={votePriceToPercentage(BigInt(negativePrice))}
            onClick={() => {
              setSelectedType('Distrust');
            }}
          />
        </Col>
      </Row>
      <Flex gap={10} justify="space-between">
        <Typography.Text type="secondary">
          <Badge status="success" /> {myVotes?.trustVotes.toString()} owned -{' '}
          {formatEth(BigInt(myVotes?.trustVotes ?? 0) * BigInt(positivePrice), 'wei')}
        </Typography.Text>
        <Typography.Text type="secondary">
          <Badge status="error" /> {myVotes?.distrustVotes.toString()} owned -{' '}
          {formatEth(BigInt(myVotes?.distrustVotes ?? 0) * BigInt(negativePrice), 'wei')}
        </Typography.Text>
      </Flex>
      {action === 'Buy' && (
        <Flex align="left" vertical gap={4}>
          <Typography.Text type="secondary">Amount</Typography.Text>
          <InputNumber
            placeholder="ETH"
            value={funds}
            onChange={(value) => {
              setFunds(value ?? 0.1);
            }}
            addonAfter="ETH"
            min={0}
            defaultValue={0.1}
            step={0.1}
          />
        </Flex>
      )}
      {action === 'Sell' && (
        <Flex align="left" vertical gap={4}>
          <Typography.Text type="secondary">Votes</Typography.Text>
          <InputNumber
            placeholder="Votes"
            value={sellVotes}
            onChange={(value) => {
              if (value) {
                setSellVotes(value);
              }
            }}
            css={css`
              width: 100%;
              input {
                text-align: center;
              }
            `}
            min={1}
            max={
              selectedType === 'Trust'
                ? Number(myVotes?.trustVotes)
                : Number(myVotes?.distrustVotes)
            }
          />
        </Flex>
      )}
      <TransactionButton
        action={action}
        positive={selectedType === 'Trust'}
        amount={funds}
        sellVoteCount={sellVotes}
        slippageBasisPoints={slippageBasisPoints}
        expectedBuyVotes={simulationResult?.votes ?? 0n}
        marketProfileId={market.profileId}
        onTransactionCompleted={onActionTaken}
      />
      {simulationResult?.error ? (
        <Typography.Text type="danger">{simulationResult.error}</Typography.Text>
      ) : (
        <Flex justify="space-between" vertical gap={4}>
          <Flex justify="space-between">
            <Typography.Text>
              {action === 'Buy' ? 'Votes purchased:' : 'Votes sold:'}
            </Typography.Text>
            <Typography.Text>{simulationResult?.votes?.toString() ?? '…'}</Typography.Text>
          </Flex>
          <Flex justify="space-between">
            <Typography.Text>
              {action === 'Buy' ? 'Funds paid:' : 'Funds received:'}
            </Typography.Text>
            <Typography.Text>
              {simulationResult?.funds
                ? formatEth(simulationResult.funds, 'wei', { maximumFractionDigits: 5 })
                : '…'}
            </Typography.Text>
          </Flex>
          <Flex justify="space-between">
            <Typography.Text>New {selectedType} Price:</Typography.Text>
            <Typography.Text>
              {simulationResult?.newPrice
                ? formatEth(simulationResult.newPrice, 'wei', { maximumFractionDigits: 5 })
                : '…'}
            </Typography.Text>
          </Flex>
        </Flex>
      )}
    </Flex>
  );
};

type VoteActionButtonProps = {
  action: 'Buy' | 'Sell';
  positive: boolean;
  amount: number;
  sellVoteCount: number;
  expectedBuyVotes: bigint;
  marketProfileId: ProfileId;
  slippageBasisPoints: number;
  onTransactionCompleted: () => void;
};

function TransactionButton({
  action,
  positive,
  amount,
  expectedBuyVotes,
  sellVoteCount,
  marketProfileId,
  slippageBasisPoints,
  onTransactionCompleted,
}: VoteActionButtonProps) {
  const buyVotes = useBuyVotes();
  const sellVotes = useSellVotes();

  const handleBuyVotes = (positive: boolean, value: bigint, expectedVotes: bigint) => {
    try {
      buyVotes
        .mutateAsync({
          profileId: marketProfileId,
          buyAmount: value,
          isPositive: positive,
          expectedVotes,
          slippageBasisPoints: BigInt(slippageBasisPoints),
        })
        .then(() => {
          onTransactionCompleted();
        });
    } catch (error) {
      console.error('Failed to buy votes:', error);
    }
  };

  const handleSellVotes = (positive: boolean, amount: number) => {
    try {
      sellVotes
        .mutateAsync({ profileId: marketProfileId, isPositive: positive, amount })
        .then(() => {
          onTransactionCompleted();
        });
    } catch (error) {
      console.error('Failed to sell votes:', error);
    }
  };

  return (
    <Button
      type="primary"
      css={css`
        width: 100%;
        background-color: ${positive ? tokenCssVars.colorSuccess : tokenCssVars.colorError};
        color: #ffffff;
      `}
      onClick={() => {
        if (amount !== null) {
          if (action === 'Buy') {
            handleBuyVotes(positive, parseEther(amount.toString()), expectedBuyVotes);
          } else {
            handleSellVotes(positive, sellVoteCount);
          }
        }
      }}
    >
      {action} {positive ? 'Trust' : 'Distrust'} Votes
    </Button>
  );
}

function NotConnectedMessage() {
  return (
    <Flex
      vertical
      justify="center"
      align="center"
      css={css`
        height: 100%;
      `}
    >
      <Typography.Title level={5}>Connect your wallet to buy or sell votes</Typography.Title>
    </Flex>
  );
}

type Props = {
  isLoading: boolean;
  market?: Awaited<ReturnType<typeof echoApi.markets.info>>;
  onActionTaken: () => void;
};

export function MarketActions({ isLoading, market, onActionTaken }: Props) {
  const { isConnected } = useCurrentUser();
  const [slippageBasisPoints, setSlippageBasisPoints] = useState(DEFAULT_SLIPPAGE_BASIS_POINTS);
  const cardStyle = css`
    height: 100%;
    box-shadow: ${tokenCssVars.boxShadowTertiary};
    .ant-card-body {
      height: 100%;
    }
  `;

  return (
    <Card css={cardStyle}>
      {isConnected ? (
        <Flex
          gap={10}
          vertical
          css={css`
            height: 100%;
          `}
        >
          <Tabs tabBarExtraContent={<SlippageCog onSlippageChanged={setSlippageBasisPoints} />}>
            {(['Buy', 'Sell'] as const).map((action) => (
              <Tabs.TabPane key={action.toLowerCase()} tab={action}>
                <ActionPanel
                  action={action}
                  isLoading={isLoading}
                  market={market}
                  slippageBasisPoints={slippageBasisPoints}
                  onActionTaken={onActionTaken}
                />
              </Tabs.TabPane>
            ))}
          </Tabs>
        </Flex>
      ) : (
        <NotConnectedMessage />
      )}
    </Card>
  );
}

function SlippageCog({
  onSlippageChanged,
}: {
  onSlippageChanged: (slippageBasisPoints: number) => void;
}) {
  const options: SegmentedOptions<number> = [
    { label: '0.1%', value: 1 },
    { label: '0.5%', value: 5 },
    { label: '1%', value: 10 },
  ];

  return (
    <Popover
      trigger="click"
      placement="left"
      content={
        <Flex
          vertical
          align="center"
          gap={10}
          css={css`
            max-width: 200px;
          `}
        >
          <Typography.Text>
            Your transaction will revert if the the price changes unfavorably by this percentage.
          </Typography.Text>
          <Segmented
            options={options}
            defaultValue={DEFAULT_SLIPPAGE_BASIS_POINTS}
            onChange={(value) => {
              onSlippageChanged(value);
            }}
          />
        </Flex>
      }
    >
      <SettingOutlined />
    </Popover>
  );
}
