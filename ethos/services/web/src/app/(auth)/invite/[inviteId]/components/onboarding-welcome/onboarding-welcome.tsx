import { css } from '@emotion/react';
import { DEFAULT_STARTING_SCORE } from '@ethos/domain';
import { Flex, Steps, theme, Tooltip, Typography } from 'antd';
import { Content } from 'antd/es/layout/layout';
import { type PropsWithChildren } from 'react';
import { type Address } from 'viem';
import { WelcomeAction } from './components/welcome-action';
import { Logo } from 'components/icons';
import { LogoInvertedSvg } from 'components/icons/logo.svg';
import { tokenCssVars } from 'config';

type Props = {
  inviteeAddress: Address;
  startOnboarding: () => void;
};

export default function OnboardingWelcome({
  inviteeAddress,
  startOnboarding,
  children,
}: PropsWithChildren<Props>) {
  const { token } = theme.useToken();

  return (
    <Content
      css={css`
        background: ${tokenCssVars.colorBgContainer};
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
        min-height: 100vh;

        @media (max-width: ${token.screenLG}px) {
          padding: 20px;
        }
      `}
    >
      <div
        css={css`
          font-size: 78px;
          color: ${tokenCssVars.colorText};
        `}
      >
        <LogoInvertedSvg fill={tokenCssVars.colorBgContainer} />
      </div>
      <Flex vertical gap={20}>
        <Flex
          justify="center"
          css={css`
            width: 100%;
            text-align: center;
          `}
        >
          <Typography.Title
            level={1}
            css={css`
              font-size: 48px;
              line-height: 0.9;
            `}
          >
            Let&apos;s build your
            <br />
            onchain reputation
          </Typography.Title>
        </Flex>
        <Flex
          justify="center"
          css={css`
            width: 100%;
            text-align: center;
          `}
        >
          <Typography.Paragraph
            css={css`
              width: 374px;
              text-align: center;
              font-size: ${token.fontSizeLG}px;

              @media (min-width: ${token.screenMD}px) {
                width: 570px;
              }
            `}
          >
            All users start with{' '}
            <strong
              css={css`
                color: ${tokenCssVars.colorPrimary};
              `}
            >
              {DEFAULT_STARTING_SCORE} <Logo />
            </strong>{' '}
            - an{' '}
            <strong
              css={css`
                color: ${tokenCssVars.colorPrimary};
              `}
            >
              Ethos Credibility Score.
            </strong>{' '}
            Onboarding will guide you through a series of steps to evaluate your existing
            credibility & add to this score.
          </Typography.Paragraph>
        </Flex>

        <OnboardingSteps />
      </Flex>
      <WelcomeAction inviteeAddress={inviteeAddress} startOnboarding={startOnboarding} />
      {children}
    </Content>
  );
}

function OnboardingSteps() {
  const { token } = theme.useToken();

  const stepColors = ['#CD8E60', '#669DAA', '#6FA57A', '#8993BD'];

  return (
    <div
      css={css`
        width: 100vw;
        background: ${tokenCssVars.colorBgLayout};
        padding: 36px 0;
        display: flex;
        justify-content: center;
        margin-bottom: 34px;

        @media (max-width: ${token.screenLG}px) {
          padding: 36px 0;
          margin-bottom: 34px;
        }

        .ant-steps-item-tail::after {
          background-color: ${tokenCssVars.colorTextTertiary} !important;
        }
        ${stepColors
          .map(
            (color, index) => `
          .ant-steps-item:nth-of-type(${index + 1}) .ant-steps-item-icon {
            background-color: ${color} !important;
            border-color: ${color} !important; // Add this line
          }
        `,
          )
          .join('\n')}

        .ant-steps-item-icon {
          .ant-steps-icon {
            color: ${tokenCssVars.colorBgContainer} !important;
          }
        }

        .ant-steps-item-process .ant-steps-item-icon {
          background-color: ${stepColors[0]} !important;
          border-color: ${stepColors[0]} !important;
        }
        .ant-steps-item-wait .ant-steps-item-icon {
          background-color: transparent !important;
          border-color: ${tokenCssVars.colorTextTertiary} !important;
        }
      `}
    >
      <div
        css={css`
          max-width: 670px;
          width: 100%;
          padding: 0 20px;
        `}
      >
        <Steps
          current={0}
          direction="horizontal"
          labelPlacement="vertical"
          responsive={false}
          css={css`
            .ant-steps-item {
              flex: 1;
              text-align: center;
              padding-top: 0;
              margin-right: 0 !important;
            }
            .ant-steps-item-tail {
              padding: 0 !important;
              margin: 0 !important;
              top: 16px !important;
              left: calc(50% + 24px) !important;
              right: calc(-50% + 24px) !important;
              width: calc(100% - 48px) !important;
            }
            .ant-steps-item-icon {
              margin: 0 auto;
              z-index: 1;
              position: relative;
            }
            .ant-steps-item-content {
              width: 100% !important;
              text-align: center;
              padding-top: 8px;
              margin-top: 0 !important; // Remove the top margin
            }
            .ant-steps-item-title {
              padding-right: 0 !important;
              margin-top: 0 !important; // Ensure no top margin on the title
            }
            @media (max-width: ${token.screenSM}px) {
              .ant-steps-item-icon {
                margin: 0 auto;
              }
              .ant-steps-item-content {
                width: auto !important;
              }
              .ant-steps-item-title {
                h5.ant-typography {
                  font-size: 12px !important;
                  line-height: 1.2 !important;
                }
              }
            }
          `}
          items={[
            {
              title: (
                <Tooltip
                  placement="bottom"
                  title="We will look at the onchain history of your wallet address to assess an initial credibility score."
                >
                  <Typography.Title level={5}>Onchain history</Typography.Title>
                </Tooltip>
              ),
            },
            {
              title: (
                <Tooltip
                  placement="bottom"
                  title="You will accept an invite from another user, which will provide a significant boost to your credibility score."
                >
                  <Typography.Title level={5}>Accept invite</Typography.Title>
                </Tooltip>
              ),
            },
            {
              title: (
                <Tooltip
                  placement="bottom"
                  title="You will connect your social accounts to your Ethos profile to verify your identity."
                >
                  <Typography.Title level={5}>Connect social</Typography.Title>
                </Tooltip>
              ),
            },
            {
              title: (
                <Tooltip
                  placement="bottom"
                  title="You will contribute to Ethos by writing your first review."
                >
                  <Typography.Title level={5}>Contribute</Typography.Title>
                </Tooltip>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
