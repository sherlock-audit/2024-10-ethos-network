'use client';

import { X_SERVICE } from '@ethos/domain';
import { notFound, useParams } from 'next/navigation';
import { ScoreExplainer } from '../../../[address]/score/_components/score.components';
import { PageLottieLoader } from 'components/loading-wrapper/lottie-loader.component';
import { useTwitterProfile } from 'hooks/api/echo.hooks';

export default function Page() {
  const params = useParams<{ username: string }>();
  const { data: twitterProfile, isPending } = useTwitterProfile(params);

  if (isPending) {
    return <PageLottieLoader />;
  }

  if (!twitterProfile) {
    return notFound();
  }

  return (
    <ScoreExplainer
      target={{ service: X_SERVICE, account: twitterProfile.id }}
      twitterUsername={twitterProfile.username}
    />
  );
}
