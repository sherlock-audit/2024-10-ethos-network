import { useWallets } from '@privy-io/react-auth';
import { Button, Card, Flex } from 'antd';
import { parseEther } from 'ethers';
import { useCallback } from 'react';
import { useAccount } from 'wagmi';
import { config } from '~/config/config.server.ts';
import { useBuyVotes, useMarketHook, useMyVotes, useSellVotes } from '~/hooks/market.tsx';

/**
 * This is a dev-only playground for the early phases of the project.
 * Use it for whatever you need.
 */
export async function loader() {
  if (config.ETHOS_ENV !== 'local') {
    throw new Response('Not Found', { status: 404 });
  }

  return {};
}

export default function DevRoute() {
  return (
    <div className="w-full">
      <WalletList />
      <Flex gap={8}>
        <MarketInfo />
        <MyVotes />
      </Flex>
    </div>
  );
}

function TransactButtons({ onTransacted }: { onTransacted: () => void }) {
  const buyVotes = useBuyVotes();
  const sellVotes = useSellVotes();

  const buy = useCallback(() => {
    buyVotes
      .mutateAsync({
        profileId: 35,
        buyAmount: parseEther('0.01'),
        isPositive: true,
        expectedVotes: 1n,
        slippageBasisPoints: 100n,
      })
      .then(onTransacted);
  }, [buyVotes, onTransacted]);

  const sell = useCallback(() => {
    sellVotes
      .mutateAsync({
        profileId: 35,
        amount: 1,
        isPositive: true,
      })
      .catch((e) => {
        console.error('Error', e);
      })
      .then(onTransacted);
  }, [sellVotes, onTransacted]);

  return (
    <Flex vertical gap={4}>
      <Button type="primary" onClick={buy}>
        Buy .01e Trust Votes
      </Button>
      <Button type="primary" onClick={sell}>
        Sell 1 Trust Vote
      </Button>
    </Flex>
  );
}

function MyVotes() {
  const { data: votes, refetch } = useMyVotes(35);

  return (
    <Card title="My Votes">
      <p>Trust: {votes?.trustVotes}</p>
      <p>Distrust: {votes?.distrustVotes}</p>
      <TransactButtons
        onTransacted={() => {
          refetch();
        }}
      />
    </Card>
  );
}

function MarketInfo() {
  const { data: market } = useMarketHook(35);

  return (
    <Card title="Market 35">
      <Flex vertical gap={4}>
        <span>ProfileId: {market?.profileId}</span>
        <span>Trust Votes: {market?.trustVotes.toString()}</span>
        <span>Distrust Votes: {market?.distrustVotes.toString()}</span>
      </Flex>
    </Card>
  );
}

function WalletList() {
  const wallets = useWallets();
  const { address } = useAccount();

  return (
    <>
      <p>Wagmi account: {address}</p>
      {wallets.wallets.map((wallet) => (
        <p key={wallet.address}>Privy wallet: {wallet.address}</p>
      ))}
    </>
  );
}
