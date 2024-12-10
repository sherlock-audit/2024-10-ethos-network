'use client';

import { type ReviewActivityInfo, type VouchActivityInfo } from '@ethos/domain';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
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

  // Updating the route in a useEffect hook to avoid the error:
  // Cannot update a component (`Router`) while rendering a different component (`Page`)
  useEffect(() => {
    const pathnameWithSlug = activity ? getActivityUrl(activity) : undefined;

    if (pathnameWithSlug && pathnameWithSlug !== pathname) {
      route.replace(pathnameWithSlug);
    }
  }, [activity, pathname, route]);
}
