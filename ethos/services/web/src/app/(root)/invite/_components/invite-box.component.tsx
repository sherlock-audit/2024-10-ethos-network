import { SyncOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { invitationScoreFactor } from '@ethos/score';
import { Button, Flex, Typography, theme, Card, Avatar } from 'antd';
import { useState } from 'react';
import { InviteModal } from './invite-modal.component';
import { AuthMiddleware } from 'components/auth/auth-middleware';
import { UserAvatar } from 'components/avatar/avatar.component';
import { InviteFilled, Logo } from 'components/icons';
import { tokenCssVars } from 'config/theme';
import { ethosHelpMechanicsInvitationsLink } from 'constant/links';
import { useCurrentUser } from 'contexts/current-user.context';
import { hideOnMobileCSS, hideOnTabletAndAboveCSS } from 'styles/responsive';

type ScoreBoxProps = {
  avatarSrc?: string;
  actor?: any; // Update this type based on your actor type
  label: string;
  score: number;
  isPositive: boolean;
};

function ScoreBox({ avatarSrc, actor, label, score, isPositive }: ScoreBoxProps) {
  return (
    <Flex gap={8} align="center">
      {avatarSrc ? <Avatar src={avatarSrc} /> : <UserAvatar actor={actor} showScore={false} />}
      <Flex vertical gap={4}>
        <Typography.Text>{label}</Typography.Text>
        <Typography.Text type="secondary">
          <Typography.Text type={isPositive ? 'success' : 'danger'} strong>
            {isPositive ? '↑' : '↓'}
            {Math.abs(score)} <Logo />
          </Typography.Text>
        </Typography.Text>
      </Flex>
    </Flex>
  );
}

function ScoreContainer({ children }: { children: React.ReactNode }) {
  const { token } = theme.useToken();

  return (
    <span
      css={css`
        background-color: ${tokenCssVars.colorBgLayout};
        border-radius: 8px;
        width: 150px;
        height: 120px;
        padding: ${token.paddingSM}px;
      `}
    >
      <Flex justify="flex-start" vertical gap={12}>
        {children}
      </Flex>
    </span>
  );
}

function BondScoreComparison({ connectedActor }: { connectedActor: any }) {
  return (
    <Flex gap={9}>
      <ScoreContainer>
        <ScoreBox
          avatarSrc="/assets/images/placeholders/vitalik.jpg"
          label="If invitee"
          score={230}
          isPositive={true}
        />
        <ScoreBox
          avatarSrc="/assets/images/placeholders/sbf.jpg"
          label="or if invitee"
          score={420}
          isPositive={false}
        />
      </ScoreContainer>
      <Flex
        vertical
        align="center"
        justify="center"
        css={css`
          height: 100%;
        `}
      >
        <Typography.Text>90d</Typography.Text>
        <SyncOutlined
          css={css`
            font-size: 30px;

            margin: 4px;
          `}
        />
        <Typography.Text>bond</Typography.Text>
      </Flex>
      <ScoreContainer>
        <ScoreBox actor={connectedActor} label="You" score={46} isPositive={true} />
        <ScoreBox actor={connectedActor} label="You" score={84} isPositive={false} />
      </ScoreContainer>
    </Flex>
  );
}

export function InviteBox() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { token } = theme.useToken();

  const { connectedActor, connectedProfile } = useCurrentUser();

  const availableInvites = connectedProfile?.invitesAvailable ?? 0;

  function handleInviteButtonClick() {
    setIsModalOpen(true);
  }

  function handleModalClose() {
    setIsModalOpen(false);
  }

  return (
    <Card>
      <Flex justify="space-between" gap={12}>
        <Flex gap={40}>
          <Flex vertical gap={8}>
            <Typography.Text
              strong
              css={css`
                font-size: ${token.fontSizeXL}px;
              `}
            >
              About invitations
            </Typography.Text>
            <Typography.Text
              css={css`
                line-height: 22px;
                font-size: 14px;
                max-width: 720px;
              `}
              type="secondary"
            >
              There is a 90 day bonding period when someone accepts your invitation. During this
              time you will earn {invitationScoreFactor * 100}% of their score, positive OR
              negative. Invitees get a percentage of your score to start.
            </Typography.Text>
            <Flex
              css={css`
                ${hideOnTabletAndAboveCSS}
                margin-bottom: 16px;
                margin-top: 8px;
              `}
            >
              <BondScoreComparison connectedActor={connectedActor} />
            </Flex>
            <Flex gap={16}>
              <AuthMiddleware>
                <Button
                  type="primary"
                  icon={<InviteFilled />}
                  onClick={handleInviteButtonClick}
                  css={css`
                    width: fit-content;
                  `}
                >
                  Invite · {availableInvites}
                </Button>
              </AuthMiddleware>
              <Button
                type="text"
                onClick={() => window.open(ethosHelpMechanicsInvitationsLink, '_blank')}
                css={css`
                  width: fit-content;
                `}
              >
                Learn more
              </Button>
            </Flex>
          </Flex>
        </Flex>
        <Flex css={hideOnMobileCSS}>
          <BondScoreComparison connectedActor={connectedActor} />
        </Flex>
        <InviteModal isOpen={isModalOpen} close={handleModalClose} />
      </Flex>
    </Card>
  );
}
