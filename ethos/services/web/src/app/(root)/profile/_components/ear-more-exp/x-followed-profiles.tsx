import { css } from '@emotion/react';
import { Avatar, Flex, theme, Typography } from 'antd';
import { tokenCssVars } from 'config/theme';

export function XFollowedProfiles() {
  const { token } = theme.useToken();

  const avatars = Array.from({ length: 3 }, (_, index) => `https://i.pravatar.cc/120?u=${index}`);
  const shift = 15;
  const size = 40;

  return (
    <Flex align="center" gap={token.marginSM}>
      <div
        css={css({
          position: 'relative',
          height: size,
          width: `${avatars.length * size - shift}px`,
        })}
      >
        {avatars.map((avatar, index) => (
          <Avatar
            key={index}
            size="default"
            src={avatar}
            css={css({
              position: 'absolute',
              top: 0,
              left: `${index * (size - shift)}px`,
              border: `1px solid ${tokenCssVars.colorTextBase} !important`,
            })}
          />
        ))}
      </div>
      <Flex vertical>
        <Typography.Text
          css={css({
            fontSize: token.fontSizeSM,
            fontWeight: token.fontWeightStrong,
            color: tokenCssVars.colorBgContainer,
          })}
        >
          Vitalik.eth, tre, coughdrop and 3 other people
        </Typography.Text>
        <Typography.Text
          css={css({
            fontSize: token.fontSizeSM,
            color: tokenCssVars.colorBgContainer,
          })}
        >
          you follow on x.com have Ethos profiles
        </Typography.Text>
      </Flex>
    </Flex>
  );
}
