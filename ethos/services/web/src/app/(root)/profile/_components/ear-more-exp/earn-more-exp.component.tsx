import { css } from '@emotion/react';
import { Button, Card, Flex, theme, Typography } from 'antd';
import { XFollowedProfiles } from './x-followed-profiles';
import { tokenCssVars } from 'config/theme';
import { ethosWaitlistLink, ethosDiscordLink } from 'constant/links';

export function EarnMoreExp() {
  const { token } = theme.useToken();

  return (
    <Card
      css={css({
        height: '100%',
        boxShadow: tokenCssVars.boxShadowTertiary,
        background: tokenCssVars.colorText,
      })}
    >
      <Flex
        gap={token.marginMD}
        align="center"
        css={css({
          height: '100%',
          [`@media (max-width: ${token.screenLG}px)`]: {
            flexDirection: 'column',
          },
        })}
      >
        <Typography.Title
          level={3}
          css={css({
            color: tokenCssVars.colorBgContainer,
          })}
        >
          Ready to earn more XP?
          <br />
          You’ll need an invite first.
        </Typography.Title>

        <Flex flex={1} justify="center">
          <XFollowedProfiles />
        </Flex>

        <Flex vertical gap={token.marginXS} align="center">
          <Button
            size="large"
            css={css({
              padding: token.paddingMD,
            })}
          >
            Ask for invite on x.com
          </Button>
          <Flex gap={token.marginXS} justify="center">
            <Button
              href={ethosWaitlistLink}
              size="middle"
              target="_blank"
              type="link"
              css={css({
                color: tokenCssVars.colorBgContainer,
              })}
            >
              Join waitlist
            </Button>
            <Button
              href={ethosDiscordLink}
              size="middle"
              type="link"
              css={css({
                color: tokenCssVars.colorBgContainer,
              })}
            >
              Join Discord
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </Card>
  );
}
