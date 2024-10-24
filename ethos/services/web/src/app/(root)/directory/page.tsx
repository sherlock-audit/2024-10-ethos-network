'use client';

import { useFeatureGate } from '@statsig/react-bindings';
import { notFound } from 'next/navigation';
import { ProfileList } from './_components/profile-list.component';
import { BasicPageWrapper } from 'components/basic-page-wrapper/basic-page-wrapper.component';
import { featureGates } from 'constant/feature-flags';

export default function Page() {
  const { value: isDirectoryPageEnabled } = useFeatureGate(featureGates.directoryPage);

  if (!isDirectoryPageEnabled) {
    return notFound();
  }

  return (
    <BasicPageWrapper title="Directory">
      <ProfileList />
    </BasicPageWrapper>
  );
}
