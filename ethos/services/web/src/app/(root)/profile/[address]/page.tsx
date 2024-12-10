'use client';

import { useParams } from 'next/navigation';
import { type Address } from 'viem';
import { ProfilePage as ProfilePageComponent } from '../_components/profile-page.component';
import { useProfilePageOptions } from '../profile-page.utils';
import { useExtractAddress } from './use-extract-address';
import { useActor } from 'hooks/user/activities';

export default function ProfilePage() {
  const params = useParams<{ address: Address }>();

  const { address: profileAddress } = params;

  const { address } = useExtractAddress(profileAddress);
  const profilePageOptions = useProfilePageOptions();

  const target = { address };
  const actor = useActor(target);

  return <ProfilePageComponent target={target} name={actor.name} options={profilePageOptions} />;
}
