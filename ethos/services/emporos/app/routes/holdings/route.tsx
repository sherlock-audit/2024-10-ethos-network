import { isValidAddress } from '@ethos/helpers';
import { type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { Flex, Typography } from 'antd';
import { HoldingCard } from './holding-card.component.tsx';
import { HoldingsProfile } from './holdings-profile.component.tsx';
import { AuthErrorBoundary } from '~/components/error/auth-error-boundary.tsx';
import { MarketLogo } from '~/components/market-logo.tsx';
import { config } from '~/config/config.server.ts';
import { validatePrivyUser } from '~/middleware.server/validate-privy-user.ts';
import { getHoldingsTotalByAddress } from '~/services.server/echo.ts';
import { getUserHoldingsByAddress } from '~/services.server/markets.ts';

export async function loader({ request }: LoaderFunctionArgs) {
  const { embeddedWallet } = await validatePrivyUser(request);

  if (!isValidAddress(embeddedWallet)) {
    throw new Response('Invalid wallet address', { status: 401, statusText: 'Unauthorized' });
  }

  const [holdings, holdingsTotal] = await Promise.all([
    getUserHoldingsByAddress({ address: embeddedWallet, pagination: { limit: 20 } }),
    getHoldingsTotalByAddress(embeddedWallet),
  ]);

  const isProd = config.ETHOS_ENV === 'prod';

  return { holdings, holdingsTotal, walletAddress: embeddedWallet, isProd };
}

export default function Holdings() {
  const { holdings, holdingsTotal, walletAddress } = useLoaderData<typeof loader>();

  return (
    <div className="w-full lg:mx-16 min-h-screen flex flex-col gap-6">
      <HoldingsProfile holdingsTotal={holdingsTotal.totalValue} walletAddress={walletAddress} />
      <Flex vertical gap={8} className="max-w-2xl">
        <Flex justify="space-between" align="center">
          <Typography.Title level={3}>Positions</Typography.Title>
          <MarketLogo />
        </Flex>
        <Flex vertical gap={12}>
          {holdings.map((holding) => (
            <HoldingCard key={`${holding.marketProfileId}-${holding.voteType}`} holding={holding} />
          ))}
        </Flex>
      </Flex>
    </div>
  );
}

export const ErrorBoundary = AuthErrorBoundary;
