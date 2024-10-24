import { css } from '@emotion/react';
import { bondingPeriod } from '@ethos/score';
import { Button, Flex, Typography, theme, Card } from 'antd';
import { useState } from 'react';
import { InviteModal } from './invite-modal.component';
import { AuthMiddleware } from 'components/auth/auth-middleware';
import { Sphere, InviteFilled } from 'components/icons';
import { tokenCssVars } from 'config';
import { ethosHelpMechanicsInvitationsLink } from 'constant/links';
import { useCurrentUser } from 'contexts/current-user.context';

export function InviteBox() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { token } = theme.useToken();

  const { connectedProfile } = useCurrentUser();
  const availableInvites = connectedProfile?.invitesAvailable ?? 0;

  const handleInviteButtonClick = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  return (
    <Card
      styles={{
        body: {
          padding: '20px 40px',
        },
      }}
    >
      <Flex
        css={css`
          @media (max-width: ${token.screenSM}px) {
            flex-direction: column;
          }
        `}
        gap={100}
      >
        <Flex
          css={css`
            @media (max-width: ${token.screenSM}px) {
              flex-direction: column;
            }
          `}
          gap={40}
        >
          <Sphere
            css={css`
              font-size: 103px;
              color: ${tokenCssVars.colorPrimary};
              @media (max-width: ${token.screenSM}px) {
                margin: auto;
              }
            `}
          />
          <Flex vertical gap={8}>
            <Typography.Text
              strong
              css={css`
                font-size: ${token.fontSizeXL}px;
                @media (max-width: ${token.screenSM}px) {
                  margin: auto;
                }
              `}
            >
              Invitations in Ethos
            </Typography.Text>
            <Typography.Text
              css={css`
                line-height: 22px;
                font-size: 14px;
                @media (max-width: ${token.screenSM}px) {
                  margin: auto;
                  padding: 0 24px;
                  text-align: center;
                }
              `}
              type="secondary"
            >
              In Ethos, invitations are a critical way to maintain a credible and sybil-resistant
              network. They encourage users to invite other credible users with the use of a bonding
              period. When a user accepts your invitation, you start a {bondingPeriod} day bonding
              period. During the bonding period, your credibility score will be influenced by
              theirs. Invitations are currently limited, and will be added to your account over
              time.
            </Typography.Text>
            <Flex gap={16}>
              <AuthMiddleware>
                <Button
                  type="primary"
                  icon={<InviteFilled />}
                  onClick={handleInviteButtonClick}
                  css={css`
                    width: fit-content;
                    @media (max-width: ${token.screenSM}px) {
                      margin: auto;
                    }
                  `}
                >
                  Invite
                </Button>
              </AuthMiddleware>
              <Button
                type="text"
                onClick={() => window.open(ethosHelpMechanicsInvitationsLink, '_blank')}
                css={css`
                  width: fit-content;
                  @media (max-width: ${token.screenSM}px) {
                    margin: auto;
                  }
                `}
              >
                Learn more
              </Button>
            </Flex>
          </Flex>
        </Flex>
        <Flex
          css={css`
            @media (max-width: ${token.screenSM}px) {
              margin: auto;
            }
          `}
          vertical
          gap={9}
        >
          <Typography.Text
            type="secondary"
            css={css`
              width: max-content;
              font-size: ${token.fontSizeLG}px;
              line-height: 22px;
            `}
          >
            Unused Invitations
          </Typography.Text>
          <Typography.Title
            css={css`
              width: max-content;
              font-size: 76px;
              margin-left: auto;
              @media (max-width: ${token.screenSM}px) {
                margin: auto;
              }
            `}
          >
            {availableInvites}
          </Typography.Title>
        </Flex>
        <InviteModal isOpen={isModalOpen} close={handleModalClose} />
      </Flex>
    </Card>
  );
}
