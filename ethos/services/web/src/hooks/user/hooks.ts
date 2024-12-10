import { type ProfileId } from '@ethos/blockchain-manager';
import { X_SERVICE, type EthosUserTargetWithTwitterUsername } from '@ethos/domain';
import { type QueryClient, queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPrimaryAddress, pickSingle } from './lookup';
import { cacheKeys } from 'constant/queries/queries.constant';
import { buildTwitterProfileOptions } from 'hooks/api/echo.hooks';
import { echoApi } from 'services/echo';
import { routeTo } from 'utils/routing';

/**
 * Custom hook to fetch a vouch by its ID.
 *
 * @param {number} id - The ID of the vouch to fetch.
 * @returns {data, isLoading, isPending ... UseQueryResult} - standard tanstack query result
 */
export function useGetVouch(id: number) {
  return useQuery({
    queryKey: cacheKeys.vouch.byId(id),
    queryFn: async () => {
      return await echoApi.vouches
        .query({ ids: [id], pagination: { limit: 1, offset: 0 } })
        .then(pickSingle);
    },
  });
}

function buildRouteToOptions(
  target: EthosUserTargetWithTwitterUsername | null,
  queryClient: QueryClient,
) {
  return queryOptions({
    queryKey: cacheKeys.profile.route(target),
    queryFn: async () => {
      if (target && 'profileId' in target) {
        const primaryAddress = await getPrimaryAddress(target);

        return routeTo(primaryAddress ? { address: primaryAddress } : null);
      }

      if (target && 'service' in target && 'account' in target) {
        const profile = await queryClient.fetchQuery(
          buildTwitterProfileOptions({ id: target.account }),
        );

        return routeTo({ service: X_SERVICE, username: profile?.username ?? target.account });
      }

      return routeTo(target);
    },
    initialData: routeTo(null),
    initialDataUpdatedAt: 0,
  });
}

export function useRouteTo(target: EthosUserTargetWithTwitterUsername | null) {
  const queryClient = useQueryClient();

  return useQuery(buildRouteToOptions(target, queryClient));
}

export async function getRouteTo(
  queryClient: QueryClient,
  target: EthosUserTargetWithTwitterUsername | null,
) {
  return await queryClient.fetchQuery(buildRouteToOptions(target, queryClient));
}

export function useGetVouchersByCredibility(profileId: ProfileId) {
  return useQuery({
    queryKey: cacheKeys.vouch.stats.byCredibility(profileId),
    queryFn: async () =>
      profileId ? await echoApi.vouches.mostCredibleVouchers({ subjectProfileId: profileId }) : [],
  });
}
