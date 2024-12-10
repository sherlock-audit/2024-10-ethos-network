import { css } from '@emotion/react';
import { Flex } from 'antd';

import { LottieLoader } from '../lottie-loader.component';

export function Loading() {
  return (
    <Flex
      css={css`
        width: 100%;
        height: 100%;
      `}
      align="center"
      justify="center"
    >
      <LottieLoader />
    </Flex>
  );
}
