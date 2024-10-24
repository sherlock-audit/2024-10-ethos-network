import { css } from '@emotion/react';
import { type StyleProps, FeedActionSizes } from './actions.type';

const borderRadiusBySize: Record<FeedActionSizes, string> = {
  [FeedActionSizes.SMALL]: '40px',
  [FeedActionSizes.MEDIUM]: '50px',
};

const paddingBySize: Record<FeedActionSizes, string> = {
  [FeedActionSizes.SMALL]: '0',
  [FeedActionSizes.MEDIUM]: '0',
};

const fontSizeBySizeProps: Record<FeedActionSizes, number> = {
  [FeedActionSizes.MEDIUM]: 24,
  [FeedActionSizes.SMALL]: 12,
};

export function getStylesBySize(
  size: FeedActionSizes,
  borderColor: string,
  bgColor: string,
  iconColor: string,
): StyleProps {
  return {
    buttonStyle: css`
      border-radius: ${borderRadiusBySize[size]};
      border: 1px solid ${borderColor};
      padding: ${paddingBySize[size]};
      background: ${bgColor};
    `,
    iconStyle: css`
      fontsize: ${fontSizeBySizeProps[size]};
      color: ${iconColor};
    `,
  };
}
