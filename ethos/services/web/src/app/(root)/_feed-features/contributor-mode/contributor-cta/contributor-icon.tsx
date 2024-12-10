import { css } from '@emotion/react';
import { Typography } from 'antd';
import { EthosStar } from 'components/icons';
import { tokenCssVars } from 'config/theme';

export function ContributorIcon({
  currentStreakDay,
  variant,
}: {
  currentStreakDay: number;
  variant: 'streak' | 'icon';
}) {
  if (variant === 'streak') {
    return (
      <Typography.Title
        level={1}
        css={css`
          color: ${tokenCssVars.colorPrimary};
          line-height: 64px;
          font-size: 67px;
        `}
      >
        {currentStreakDay}
      </Typography.Title>
    );
  }

  return <EthosStar css={{ fontSize: 48, color: tokenCssVars.colorPrimary }} />;
}
