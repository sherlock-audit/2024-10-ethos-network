import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { css } from '@emotion/react';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Alert, Button, Card, Flex, Typography } from 'antd';
import type * as React from 'react';
import { useMemo } from 'react';
import { zeroAddress } from 'viem';
import {
  AcceptInviteIcon,
  AssignmentIcon,
  CheckCircleOutline,
  DiscordIcon,
  IntersectIcon,
  SlashIcon,
  Wallet,
} from 'components/icons';
import { SkeletonCard } from 'components/loading-wrapper/components/skeleton-card.component';
import { tokenCssVars } from 'config/theme';
import { ethosDiscordLink, ethosWaitlistLink } from 'constant/links';
import { useCurrentUser } from 'contexts/current-user.context';
import { useIsIOS } from 'hooks/use-is-IOS';
import { useHideIntercom } from 'hooks/useHideIntercom';
import { usePendingInvitationsBySubject } from 'hooks/user/lookup';
import { hideOnTabletAndAboveCSS } from 'styles/responsive';

export type NoProfileCardType = 'noProfile' | 'pendingInvitation' | 'notConnected';

type Props = {
  isMobile?: boolean;
};

const copy = {
  noProfile: {
    title: 'Limited access',
    icon: IntersectIcon,
    description: 'Your wallet address must first be invited to participate in Ethos.',
    buttonText: 'Join waitlist',
    buttonIcon: <AssignmentIcon />,
    link: ethosWaitlistLink,
  },
  pendingInvitation: {
    title: 'Pending Invitation',
    icon: AcceptInviteIcon,
    description: 'Someone has invited you to Ethos! Accept to see your credibility score',
    buttonText: 'Accept invite',
    buttonIcon: <CheckCircleOutline />,
    link: '/invite/accept',
  },
  notConnected: {
    title: 'Not connected',
    icon: SlashIcon,
    description: 'Connect your wallet to see your profile card and score here.',
    buttonText: 'Connect wallet',
    buttonIcon: <Wallet />,
    link: undefined,
  },
};

export function NoProfileWidget({ isMobile }: Props) {
  const { connectedAddress, status, isConnectedProfileLoading } = useCurrentUser();
  const { openConnectModal } = useConnectModal();

  const { data: pendingInvitations, isPending: pendingInvitationsPending } =
    usePendingInvitationsBySubject({
      address: connectedAddress ?? zeroAddress,
    });
  const pendingInvitationsCount = pendingInvitations?.length ?? 0;

  const isLoading =
    status === 'connecting' ||
    status === 'reconnecting' ||
    isConnectedProfileLoading ||
    pendingInvitationsPending;

  const noProfileType: NoProfileCardType = useMemo(() => {
    if (!connectedAddress) {
      return 'notConnected';
    }

    if (pendingInvitationsCount > 0) {
      return 'pendingInvitation';
    }

    return 'noProfile';
  }, [connectedAddress, pendingInvitationsCount]);

  const { title, icon: Icon, description, buttonText, buttonIcon, link } = copy[noProfileType];

  if (isLoading) {
    return isMobile ? null : <SkeletonCard rows={4} />;
  }

  if (isMobile) {
    return (
      <NoProfileWidgetMobile
        title={title}
        Icon={Icon}
        buttonText={buttonText}
        link={link}
        reason={noProfileType}
      />
    );
  }

  return (
    <Card
      css={css`
        background-color: ${tokenCssVars.colorPrimary};
        color: ${tokenCssVars.colorBgContainer};
      `}
    >
      <Flex vertical gap={13} align="center" justify="center">
        <Flex vertical gap={6} align="center">
          <Icon
            css={css`
              font-size: 43px;
            `}
          />
          <Typography.Title level={3} css={{ color: 'inherit' }}>
            {title}
          </Typography.Title>
        </Flex>
        <Typography.Text
          css={css`
            line-height: 22px;
            text-align: center;
            color: inherit;
          `}
        >
          {description}
        </Typography.Text>
        <Flex vertical gap={9}>
          <Button
            icon={buttonIcon}
            type="primary"
            href={link}
            target={link?.startsWith('http') ? '_blank' : undefined}
            onClick={noProfileType === 'notConnected' ? openConnectModal : undefined}
            css={css`
              background: ${tokenCssVars.colorBgContainer};
              color: ${tokenCssVars.colorPrimary};

              :hover {
                color: ${tokenCssVars.colorPrimaryHover};
              }
            `}
          >
            {buttonText}
          </Button>
          <Button
            icon={<DiscordIcon />}
            type="link"
            href={ethosDiscordLink}
            target="_blank"
            css={css`
              color: ${tokenCssVars.colorBgContainer};

              :hover {
                color: ${tokenCssVars.colorBgLayout};
              }
            `}
          >
            Join Discord
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
}

type MobileWidgetProps = {
  title: string;
  Icon: (props: Partial<CustomIconComponentProps>) => React.JSX.Element;
  buttonText: string;
  link?: string;
  reason: NoProfileCardType;
};

export function NoProfileWidgetMobile({
  title,
  Icon,
  buttonText,
  link,
  reason,
}: MobileWidgetProps) {
  useHideIntercom();
  const { openConnectModal } = useConnectModal();
  const isIOS = useIsIOS();

  return (
    <Alert
      message={<Typography.Title level={3}>{title}</Typography.Title>}
      banner
      showIcon
      icon={<Icon />}
      type="info"
      css={css`
        ${hideOnTabletAndAboveCSS}
        position: fixed;
        bottom: 0;
        background-color: ${tokenCssVars.colorPrimary};
        width: 100%;
        left: 0;
        padding: 22px 14px;
        padding-bottom: ${isIOS ? '35px' : '22px'};
        color: ${tokenCssVars.colorBgContainer};

        &.ant-alert.ant-alert-info .anticon {
          color: inherit;
        }

        & .ant-alert-icon {
          font-size: 28px;
          margin-right: 11px;
        }

        & .ant-alert-message .ant-typography {
          color: ${tokenCssVars.colorBgContainer};
        }
      `}
      action={
        <Button
          href={link}
          target={link?.startsWith('http') ? '_blank' : undefined}
          onClick={reason === 'notConnected' ? openConnectModal : undefined}
          css={css`
            color: ${tokenCssVars.colorPrimary};
            background: ${tokenCssVars.colorBgContainer};
          `}
        >
          {buttonText}
        </Button>
      }
    />
  );
}
