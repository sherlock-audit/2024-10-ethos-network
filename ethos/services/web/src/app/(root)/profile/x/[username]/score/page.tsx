'use client';

import { css } from '@emotion/react';
import { X_SERVICE } from '@ethos/domain';
import { Flex } from 'antd';
import { notFound } from 'next/navigation';
import { ScoreExplainer } from '../../../[address]/score/_components/score.components';
import { PageLottieLoader } from 'components/loading-wrapper/lottie-loader.component';
import { tokenCssVars } from 'config';
import { useTwitterProfile } from 'hooks/api/echo.hooks';

export type TwitterScorePageProps = {
  params: { username: string };
};

function Page({ params }: TwitterScorePageProps) {
  const { data: twitterProfile, isPending } = useTwitterProfile(params);

  if (isPending) {
    return <PageLottieLoader />;
  }

  if (!twitterProfile) {
    return notFound();
  }

  return (
    <Flex
      justify="center"
      css={css`
        background-color: ${tokenCssVars.colorBgLayout};
        width: 100%;
        padding: 24px;
      `}
    >
      <ScoreExplainer
        target={{ service: X_SERVICE, account: twitterProfile.id }}
        twitterUsername={twitterProfile.username}
      />
    </Flex>
  );
}

export default Page;
