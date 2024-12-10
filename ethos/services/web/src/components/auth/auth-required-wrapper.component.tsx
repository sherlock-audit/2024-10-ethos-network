'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { Card, Flex, Spin, theme } from 'antd';
import { useRouter } from 'next/navigation';
import { type ReactNode, type PropsWithChildren } from 'react';
import { zeroAddress } from 'viem';
import { InviteRequired } from 'components/auth/invite-required.component';
import { WalletNotConnected } from 'components/auth/wallet-not-connected.component';
import { ONBOARDING_SKIP_SESSION_KEY } from 'constant/constants';
import { useCurrentUser } from 'contexts/current-user.context';
import { useSessionStorage } from 'hooks/use-storage';
import { usePendingInvitationsBySubject } from 'hooks/user/lookup';
import { getAcceptInviteUrl } from 'utils/routing';

function MessageCard({ children }: PropsWithChildren): ReactNode {
  const { token } = theme.useToken();

  return (
    <Card
      css={css`
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin-top: ${token.marginXL}px;
        width: 100%;
        @media (min-width: ${token.screenMD}px) {
          width: 562px;
          margin-inline: auto;
        }
      `}
    >
      {children}
    </Card>
  );
}

export function AuthRequiredWrapper({ children }: PropsWithChildren): ReactNode {
  const [shouldSkipOnboarding] = useSessionStorage<boolean>(ONBOARDING_SKIP_SESSION_KEY);
  const { status, connectedAddress, connectedProfile, isConnectedProfileLoading } =
    useCurrentUser();
  const router = useRouter();
  const { isPending: pendingInvitationsLoading, data: pendingInvitations } =
    usePendingInvitationsBySubject(
      {
        address: connectedAddress ?? zeroAddress,
      },
      shouldSkipOnboarding,
    );

  const hasPendingInvitations = Boolean(
    !connectedProfile && pendingInvitations?.length && connectedAddress && !shouldSkipOnboarding,
  );

  if (
    isConnectedProfileLoading ||
    (pendingInvitationsLoading && !shouldSkipOnboarding) || // pending is always true when enabled is false
    hasPendingInvitations ||
    status === 'reconnecting' ||
    status === 'connecting'
  ) {
    if (hasPendingInvitations) {
      const inviteUrl = getAcceptInviteUrl();
      router.push(inviteUrl);
    }

    return (
      <Card
        css={css`
          width: 100%;
        `}
      >
        <Flex justify="center">
          <Spin indicator={<LoadingOutlined css={{ fontSize: 24 }} spin />} />
        </Flex>
      </Card>
    );
  }

  if (status !== 'connected') {
    return (
      <MessageCard>
        <WalletNotConnected />
      </MessageCard>
    );
  }

  if (!connectedProfile) {
    return (
      <MessageCard>
        <InviteRequired />
      </MessageCard>
    );
  }

  return children;
}
