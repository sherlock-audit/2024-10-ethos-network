import { css } from '@emotion/react';
import { Flex, theme } from 'antd';
import { type AvatarSize } from 'antd/es/avatar/AvatarContext';
import { Logo } from 'components/icons';
import { tokenCssVars } from 'config/theme';
import { useScoreCategory } from 'utils/scoreCategory';

type PersonScoreVariant = 'plain' | 'elevated' | 'flat';

type PersonScoreProps = {
  score: number;
  variant?: PersonScoreVariant;
  size?: AvatarSize;
};

const { useToken } = theme;

export function PersonScore({ score, variant = 'flat', size = 'small' }: PersonScoreProps) {
  const { token } = useToken();
  const [scoreCategory] = useScoreCategory(score);

  const LARGE_SCORE_THRESHOLD = 100;

  const sizeStyleOverride =
    typeof size === 'number' && size >= LARGE_SCORE_THRESHOLD
      ? css`
          font-size: 14px;
          font-weight: 600;
          padding-inline: 15px;
          width: auto;
        `
      : null;

  const variantStyles =
    variant === 'elevated'
      ? css`
          background: ${tokenCssVars.colorBgContainer};
          box-shadow: 0 0 0 2px ${tokenCssVars.colorBgBase};
          padding: 0 5px;
        `
      : variant === 'flat'
        ? css`
            background: ${tokenCssVars.colorBgBase};
            box-shadow: 0 0 0 2px ${tokenCssVars.colorBgContainer};
            padding: 0 5px;
          `
        : css`
            background: ${tokenCssVars.colorBgContainer};
            padding: ${token.paddingXXS}px ${token.paddingXS}px;
          `;

  if (size === 'default')
    return (
      <Flex
        align="center"
        justify="center"
        css={css`
          width: 15px;
          height: 15px;
          border-radius: 12px;
          background: ${scoreCategory.color};
          box-shadow: 0 0 0 2px ${tokenCssVars.colorBgContainer};
        `}
      >
        <Logo
          css={{
            fontSize: 8,
            color: tokenCssVars?.colorBgContainer,
          }}
        />
      </Flex>
    );

  return (
    <Flex
      align="center"
      gap={2}
      justify="center"
      css={css`
        ${variantStyles}
        width: 44px;
        border-radius: 50px;
        color: ${tokenCssVars.colorText};
        font-size: 10px;
        font-style: normal;
        font-weight: 500;
        ${sizeStyleOverride}
      `}
    >
      {score}
      <Logo
        css={{
          fontSize: typeof size === 'number' && size >= LARGE_SCORE_THRESHOLD ? 10 : 8,
          color: scoreCategory.color,
        }}
      />
    </Flex>
  );
}
