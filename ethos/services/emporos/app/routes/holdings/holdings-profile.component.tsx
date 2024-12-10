import { formatEth } from '@ethos/helpers';
import { useFundWallet } from '@privy-io/react-auth';
import { Button, Card, Flex, Tooltip, Typography } from 'antd';
import { type Address } from 'viem';
import { useBalance } from 'wagmi';
import { useEnvironment } from '~/hooks/env.tsx';

export function HoldingsProfile({
  holdingsTotal,
  walletAddress,
}: {
  holdingsTotal: bigint;
  walletAddress: Address;
}) {
  const { data: balance } = useBalance({
    address: walletAddress,
  });

  const { fundWallet } = useFundWallet();
  const environment = useEnvironment();

  return (
    <Card className="w-full md:w-fit min-w-80">
      <Flex vertical className="gap-4">
        <Flex className="gap-2 md:gap-4" justify="space-between">
          <Flex vertical>
            <Typography.Title level={4}>Holdings</Typography.Title>
            <Typography.Title level={2}>{formatEth(holdingsTotal, 'wei')}</Typography.Title>
          </Flex>
          <Flex vertical>
            <Typography.Title level={4}>Wallet Balance</Typography.Title>
            <Typography.Title level={2}>{formatEth(balance?.value ?? 0n, 'wei')}</Typography.Title>
          </Flex>
        </Flex>
        <Tooltip title={environment === 'prod' ? undefined : 'Works on mainnet only'}>
          <Button
            type="primary"
            onClick={async () => {
              await fundWallet(walletAddress);
            }}
          >
            Fund wallet
          </Button>
        </Tooltip>
      </Flex>
    </Card>
  );
}
