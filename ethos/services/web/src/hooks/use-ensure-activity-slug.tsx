'use client';

import { type ReviewActivityInfo, type VouchActivityInfo } from '@ethos/domain';
import { usePathname, useRouter } from 'next/navigation';
import { type SetRequired } from 'type-fest';
import { getActivityUrl } from 'utils/routing';

/**
 * Ensure that the current URL has the correct slug for the activity
 */
export function useEnsureActivitySlug(
  activity: SetRequired<Partial<ReviewActivityInfo | VouchActivityInfo>, 'data' | 'type'> | null,
) {
  const route = useRouter();
  const pathname = usePathname();

  const pathnameWithSlug = activity ? getActivityUrl(activity) : undefined;

  if (pathnameWithSlug && pathnameWithSlug !== pathname) {
    route.replace(pathnameWithSlug);
  }
}
