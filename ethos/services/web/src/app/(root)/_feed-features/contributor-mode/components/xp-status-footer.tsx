import { css } from '@emotion/react';
import { Flex, theme, Typography } from 'antd';
import { UserAvatar } from 'components/avatar/avatar.component';
import { ArrowUp, EthosStar } from 'components/icons';
import { tokenCssVars } from 'config';
import { useCurrentUser } from 'contexts/current-user.context';
import { useThemeMode } from 'contexts/theme-manager.context';

export function XpStatusFooter({ earnedXpAmount }: { earnedXpAmount: number }) {
  const { connectedActor } = useCurrentUser();
  const { token } = theme.useToken();
  const mode = useThemeMode();

  return (
    <Flex
      align="center"
      justify="space-between"
      gap={8}
      css={css`
        position: relative;
        padding: 17px 12px;
        background: ${tokenCssVars.colorPrimary};
        margin-top: auto;
        width: 100%;

        @media (min-width: ${token.screenSM}px) {
          margin-bottom: ${token.margin}px;
          padding: 20px;
          border-radius: 12px;
          width: 430px;
          justify-content: space-between;
        }
      `}
    >
      <Flex align="center" gap={12}>
        <UserAvatar
          actor={connectedActor}
          showScore={false}
          showHoverCard={false}
          renderAsLink={false}
        />
        <Flex vertical>
          <Typography.Text
            css={{
              color: tokenCssVars.colorBgContainer,
              lineHeight: '20px',
            }}
          >
            You gained <strong>{earnedXpAmount} XP</strong>.
          </Typography.Text>
          <Typography.Text
            css={{
              color: tokenCssVars.colorBgContainer,
              lineHeight: '20px',
            }}
          >
            Finish this review to get 90 more.
          </Typography.Text>
        </Flex>
      </Flex>
      <Flex
        align="center"
        justify="flex-end"
        gap={2}
        css={css`
          padding: 4px 8px;
          color: ${tokenCssVars.colorBgContainer};
          background: ${mode === 'light' ? tokenCssVars.colorPrimaryTextActive : '#2E6BA4'};
          border-radius: 8px;
        `}
      >
        <ArrowUp css={{ fontSize: 32 }} />
        <Typography.Title
          level={1}
          css={{
            color: tokenCssVars.colorBgContainer,
            whiteSpace: 'nowrap',
          }}
        >
          {earnedXpAmount}
        </Typography.Title>
        <EthosStar css={{ fontSize: 32 }} />
      </Flex>
    </Flex>
  );
}
