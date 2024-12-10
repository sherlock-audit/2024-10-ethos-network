import { css } from '@emotion/react';
import { Flex, theme, Typography } from 'antd';
import { OnboardingStep } from '../onboarding-step.component';
import { TwitterConnectFlow } from '../twitter-connect-flow.component';

type Props = {
  stepCompleted: () => void;
  selectedTwitterProfileId?: (profileId: string) => void;
};

export function ConnectSocialStep({ stepCompleted, selectedTwitterProfileId }: Props) {
  const { token } = theme.useToken();

  return (
    <OnboardingStep
      icon={
        <div
          css={css`
            position: relative;
            width: 150px;
            height: 150px;
          `}
        >
          <div
            css={css`
              width: 180px;
              height: 180px;
              background-color: #6fa57a;
              border-radius: 50%;
            `}
          />
        </div>
      }
      title={
        <>
          Connect
          <br />
          Social
        </>
      }
      description={
        <Flex
          justify="center"
          css={css`
            width: 374px;
          `}
        >
          <Typography.Paragraph
            css={css`
              font-size: ${token.fontSizeLG}px;
            `}
          >
            You&apos;ve already built reputation on X.com.
            <br /> Let&apos;s add that to your score.
          </Typography.Paragraph>
        </Flex>
      }
    >
      <TwitterConnectFlow
        connectCompleted={() => {
          stepCompleted?.();
        }}
        connectSkipped={() => {
          stepCompleted?.();
        }}
        selectedTwitterProfileId={selectedTwitterProfileId}
      />
    </OnboardingStep>
  );
}
