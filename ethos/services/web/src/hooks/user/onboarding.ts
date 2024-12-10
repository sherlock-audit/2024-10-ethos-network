import { useQuery } from '@tanstack/react-query';
import { cacheKeys } from 'constant/queries/queries.constant';
import { echoApi } from 'services/echo';

/**
 * Custom hook to fetch the onboarding status of a profile.
 */
export function useOnboardingStatus(profileId: number | undefined, targetScore: number) {
  return useQuery({
    queryKey: cacheKeys.onboarding.status(profileId, targetScore),
    queryFn: async () => {
      if (!profileId) {
        return undefined;
      }

      return await echoApi.onboarding.status(profileId, targetScore);
    },
    enabled: Boolean(profileId),
  });
}
