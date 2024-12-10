import { css } from '@emotion/react';
import { formatNumber } from '@ethos/helpers';
import { Flex, Tag } from 'antd';
import { tokenCssVars } from 'config/theme';

type Props = {
  numReviews: number;
  positiveReviewsPercentage: number;
  strong?: boolean;
};

export function ProfileReviewScoreTag({ numReviews, positiveReviewsPercentage, strong }: Props) {
  return (
    <Flex justify="flex-end">
      <Tag
        color={tokenCssVars.colorBgLayout}
        css={css`
          color: ${numReviews > 0
            ? positiveReviewsPercentage > 79
              ? tokenCssVars.colorSuccess
              : positiveReviewsPercentage > 49
                ? tokenCssVars.colorWarningTextActive
                : tokenCssVars.colorError
            : tokenCssVars.colorText};
          margin-right: 0;
          font-weight: ${strong ? 600 : undefined};
        `}
      >
        {numReviews > 0
          ? formatNumber(positiveReviewsPercentage, { maximumFractionDigits: 2 }) + '% positive'
          : 'No reviews'}
      </Tag>
    </Flex>
  );
}
