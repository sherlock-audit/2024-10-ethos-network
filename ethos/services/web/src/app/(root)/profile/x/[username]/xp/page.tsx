'use client';

import { X_SERVICE } from '@ethos/domain';
import { notFound, useParams } from 'next/navigation';
import { XpHistory } from 'app/(root)/profile/[address]/xp/_components/xp-history.component';
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

  return <XpHistory target={{ service: X_SERVICE, account: twitterProfile.id }} />;
}
