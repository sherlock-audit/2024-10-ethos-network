import { css } from '@emotion/react';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Button, Card, Flex, Typography } from 'antd';
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
import { tokenCssVars } from 'config';
import { ethosDiscordLink, ethosWaitlistLink } from 'constant/links';

export type NoProfileCardType = 'noProfile' | 'pendingInvitation' | 'notConnected';

type Props = {
  type: NoProfileCardType;
  isLoading?: boolean;
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

export function NoProfileCard({ type, isLoading }: Props) {
  const { title, icon: Icon, description, buttonText, buttonIcon, link } = copy[type];
  const { openConnectModal } = useConnectModal();

  if (isLoading) {
    return <SkeletonCard rows={4} />;
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
            onClick={type === 'notConnected' ? openConnectModal : undefined}
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
