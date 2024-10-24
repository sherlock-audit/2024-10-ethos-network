'use client';

import { X_SERVICE, type EthosUserTarget } from '@ethos/domain';
import { notFound } from 'next/navigation';
import { ProfilePage } from '../../_components/profile-page.component';
import { useProfilePageOptions } from '../../profile-page.utils';
import { PageLottieLoader } from 'components/loading-wrapper/lottie-loader.component';
import { useTwitterProfile } from 'hooks/api/echo.hooks';

export type TwitterPageProps = {
  params: { username: string };
};

export default function TwitterPage({ params }: TwitterPageProps) {
  const { data: twitterProfile, isPending } = useTwitterProfile(params);
  const profilePageOptions = useProfilePageOptions();

  if (isPending) {
    return <PageLottieLoader />;
  }

  if (!twitterProfile) {
    return notFound();
  }

  const target: EthosUserTarget = {
    service: X_SERVICE,
    account: twitterProfile.id,
  };

  return (
    <ProfilePage
      target={target}
      twitterProfile={twitterProfile}
      name={twitterProfile.name || twitterProfile.username}
      options={profilePageOptions}
    />
  );
}
