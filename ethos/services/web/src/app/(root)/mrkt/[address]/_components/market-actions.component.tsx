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
} from 'antd';
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
  market?: Awaited<ReturnType<typeof echoApi.markets.info>>;
  onActionTaken: () => void;
};
const ActionPanel = ({ action, isLoading, market, onActionTaken }: ActionPanelProps) => {
  const { connectedAddress } = useCurrentUser();
  const { data: myVotes } = useMyVotes(market?.profileId ?? 0);
  const [funds, setFunds] = useState<number>(0.1);
  const [maxVotes, setMaxVotes] = useState<number>(33);
  const [selectedType, setSelectedType] = useState<'Trust' | 'Distrust'>('Trust');

  const debouncedFunds = useDebouncedValue(funds, 500);
  const debouncedVotes = useDebouncedValue(maxVotes, 500);
  const debouncedSelectedType = useDebouncedValue(selectedType, 550);

  const { data: simulationResult } = useSimulatedTransaction({
    action,
    profileId: market?.profileId ?? 0,
    isPositive: debouncedSelectedType === 'Trust',
    amount: debouncedVotes,
    funds: parseEther(debouncedFunds.toString()),
    address: connectedAddress,
  });

  useEffect(() => {
    if (action === 'Sell') {
      const maxAllowed = selectedType === 'Trust' ? myVotes?.trustVotes : myVotes?.distrustVotes;
      setMaxVotes(Math.min(Number(maxAllowed ?? 0), maxVotes));
    }
  }, [action, myVotes?.trustVotes, myVotes?.distrustVotes, maxVotes, selectedType]);

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
        <Col xs={24} sm={12}>
          <ToggleButton
            type="Trust"
            isSelected={selectedType === 'Trust'}
            price={votePriceToPercentage(BigInt(positivePrice))}
            onClick={() => {
              setSelectedType('Trust');
            }}
          />
        </Col>
        <Col xs={24} sm={12}>
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
      <Flex
        gap={10}
        css={css`
          justify-content: space-between;
        `}
      >
        <Typography.Text type="secondary">
          <Badge status="success" /> {myVotes?.trustVotes.toString()} owned -{' '}
          {formatEth(BigInt(myVotes?.trustVotes ?? 0) * BigInt(positivePrice), 'wei')}
        </Typography.Text>
        <Typography.Text type="secondary">
          <Badge status="error" /> {myVotes?.distrustVotes.toString()} owned -{' '}
          {formatEth(BigInt(myVotes?.distrustVotes ?? 0) * BigInt(negativePrice), 'wei')}
        </Typography.Text>
      </Flex>
      <Flex align="center" justify="space-between">
        <Typography.Text type="secondary">
          {action === 'Buy' ? 'Max spend:' : 'Min sell:'}
        </Typography.Text>
        <InputNumber
          placeholder="ETH"
          disabled={action === 'Sell'}
          value={funds}
          onChange={(value) => {
            setFunds(value ?? 0.1);
          }}
          addonAfter="ETH"
          min={0}
          defaultValue={0.1}
        />
      </Flex>
      <Flex gap={10} align="center">
        <InputNumber
          placeholder="Votes"
          value={maxVotes}
          onChange={(value) => {
            if (value) {
              setMaxVotes(value);
            }
          }}
          min={1}
          max={
            action === 'Buy'
              ? undefined
              : selectedType === 'Trust'
                ? Number(myVotes?.trustVotes)
                : Number(myVotes?.distrustVotes)
          }
          addonAfter="Votes"
        />
      </Flex>
      <TransactionButton
        action={action}
        positive={selectedType === 'Trust'}
        amount={funds}
        maxVotes={maxVotes}
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
  maxVotes: number;
  marketProfileId: ProfileId;
  onTransactionCompleted: () => void;
};

function TransactionButton({
  action,
  positive,
  amount,
  maxVotes,
  marketProfileId,
  onTransactionCompleted,
}: VoteActionButtonProps) {
  const buyVotes = useBuyVotes();
  const sellVotes = useSellVotes();

  const handleBuyVotes = (positive: boolean, value: bigint, maxVotes: number | bigint) => {
    try {
      buyVotes
        .mutateAsync({ profileId: marketProfileId, isPositive: positive, value, maxVotes })
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
            handleBuyVotes(positive, parseEther(amount.toString()), maxVotes);
          } else {
            handleSellVotes(positive, maxVotes);
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
          <Tabs tabBarExtraContent={<SlippageCog />}>
            {(['Buy', 'Sell'] as const).map((action) => (
              <Tabs.TabPane key={action.toLowerCase()} tab={action}>
                <ActionPanel
                  action={action}
                  isLoading={isLoading}
                  market={market}
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

function SlippageCog() {
  return (
    <Popover
      content={
        <div
          css={css`
            max-width: 150px;
          `}
        >
          <Typography.Text>
            Slippage tolerance is currently <Typography.Text strong>1%</Typography.Text> by default
            and not configurable at this time.
          </Typography.Text>
        </div>
      }
    >
      <SettingOutlined />
    </Popover>
  );
}
