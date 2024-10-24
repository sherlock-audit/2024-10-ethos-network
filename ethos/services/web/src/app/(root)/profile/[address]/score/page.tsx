'use client';

import { css } from '@emotion/react';
import { Flex } from 'antd';
import { useParams } from 'next/navigation';
import { useExtractAddress } from '../use-extract-address';
import { ScoreExplainer } from './_components/score.components';
import { tokenCssVars } from 'config';

export default function Page() {
  const params = useParams<{ address: string }>();
  const { address } = useExtractAddress(params.address);

  return (
    <Flex
      justify="center"
      css={css`
        background-color: ${tokenCssVars.colorBgLayout};
        width: 100%;
        padding: 24px;
      `}
    >
      <ScoreExplainer target={{ address }} />
    </Flex>
  );
}
