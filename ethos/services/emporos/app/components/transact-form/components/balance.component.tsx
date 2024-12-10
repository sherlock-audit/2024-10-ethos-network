import { formatEth, toNumber } from '@ethos/helpers';
import { useWallets } from '@privy-io/react-auth';
import { Flex, Typography } from 'antd';
import clsx from 'clsx';
import { getAddress } from 'viem';
import { useBalance } from 'wagmi';
import { useSellSubmit } from '../hooks/use-sell.ts';
import { HandCoinIcon } from '~/components/icons/hand-coin.tsx';
import { WalletIcon } from '~/components/icons/wallet.tsx';
import { useTransactionForm } from '~/routes/market.$id/transaction-context.tsx';

function Balance({
  balanceIcon,
  balanceLabel,
  className,
}: {
  balanceIcon: React.ReactNode;
  balanceLabel: string;
  className?: string;
}) {
  return (
    <Flex
      gap={8}
      align="center"
      justify="center"
      className={clsx(
        'px-4 py-2 bg-antd-colorBgContainer text-antd-colorTextSecondary rounded-100 w-fit mx-auto',
        className,
      )}
    >
      <span className="text-base/none">{balanceIcon}</span>
      <Typography.Text className="text-sm">{balanceLabel}</Typography.Text>
    </Flex>
  );
}

export function WalletBalance({ className }: { className?: string }) {
  const { wallets } = useWallets();
  const { data: balance } = useBalance({
    address: wallets.length > 0 ? getAddress(wallets[0].address) : undefined,
  });

  return (
    <Balance
      className={className}
      balanceIcon={<WalletIcon />}
      balanceLabel={`Balance: ${formatEth(balance?.value ?? 0n, 'wei')}`}
    />
  );
}

export function VoteBalance({ className }: { className?: string }) {
  const { myOwnedVotes } = useSellSubmit();
  const { state } = useTransactionForm();
  const votesToSell = toNumber(
    state.voteType === 'trust' ? myOwnedVotes?.trustVotes : myOwnedVotes?.distrustVotes,
  );

  return (
    <Balance
      className={className}
      balanceIcon={<HandCoinIcon />}
      balanceLabel={`Owned: ${votesToSell}`}
    />
  );
}
