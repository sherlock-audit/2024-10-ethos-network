import { css } from '@emotion/react';
import { Flex, Tag, theme, Typography } from 'antd';
import { Logo } from 'components/icons';
import { tokenCssVars } from 'config/theme';

export function StepFour() {
  const { token } = theme.useToken();

  return (
    <Flex
      vertical
      align="center"
      justify="center"
      gap={token.marginMD}
      css={css({
        height: tokenCssVars.fullHeight,
        background: tokenCssVars.colorBgContainer,
        padding: `${token.padding}px`,
      })}
    >
      <Typography.Title
        level={3}
        css={css({
          textAlign: 'center',
        })}
      >
        We inform
      </Typography.Title>
      <Typography.Text
        css={css({
          textAlign: 'center',
        })}
      >
        who can be trusted and who can’t <br /> through a single credibility score
      </Typography.Text>
      <Tag
        bordered={false}
        color="default"
        css={css({
          backgroundColor: tokenCssVars.colorBgLayout,
          padding: `${token.paddingXXS}px ${token.paddingLG}px`,
        })}
      >
        <Typography.Title
          css={css({
            color: tokenCssVars.colorPrimary,
          })}
        >
          <Flex justify="center" gap={token.marginXXS}>
            1700{' '}
            <Logo
              css={css({
                fontSize: '66%',
              })}
            />
          </Flex>
        </Typography.Title>
      </Tag>
    </Flex>
  );
}
