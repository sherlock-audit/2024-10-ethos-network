import {
  type EthosUserTarget,
  fromUserKey,
  type RecentInteractionActivityActor,
} from '@ethos/domain';
import { isAddressEqualSafe, notEmpty } from '@ethos/helpers';
import { useDynamicConfig } from '@statsig/react-bindings';
import { useMemo } from 'react';
import { dynamicConfigs, type DynamicConfigValues } from 'constant/feature-flags';
import { useCurrentUser } from 'contexts/current-user.context';
import { useRecentInteractions } from 'hooks/api/echo.hooks';
import { useActivityActorsBulk } from 'hooks/user/activities';

const MAX_PROFILE_COUNT = 6;

export function parseDynamicProfileTargets(
  targetData: ReturnType<typeof useDynamicConfig>['value'],
): EthosUserTarget[] {
  if ('targets' in targetData && Array.isArray(targetData.targets)) {
    return parseTargets(targetData.targets);
  }

  return [];
}

export function parseTargets(targets: any[]): EthosUserTarget[] {
  return targets
    .map((target) => {
      try {
        return fromUserKey(String(target));
      } catch (err) {
        // Someone entered a poorly formatted target in statsig.
        return null;
      }
    })
    .filter(notEmpty);
}

export function selectRandomTargets(
  targets: EthosUserTarget[],
  count: number = 6,
): EthosUserTarget[] {
  const shuffled = [...targets].sort(() => 0.5 - Math.random());

  return shuffled.slice(0, Math.min(count, targets.length));
}

export function usePeopleToReview(
  numberOfPeople: number = MAX_PROFILE_COUNT,
  configKey: DynamicConfigValues = dynamicConfigs.profilesToReview,
) {
  // TODO: Improve this hook to receive an excludedAddresses param
  const { status: connectedAddressStatus, connectedAddress } = useCurrentUser();
  const dynamicConfigData = useDynamicConfig(configKey);

  const targetsToReview = useMemo(
    () =>
      selectRandomTargets(
        parseDynamicProfileTargets(dynamicConfigData.value),
        // Grabbing an extra profile to cover the case where the connected user is filtered out.
        // The additional profile will be hidden overflow if necessary.
        numberOfPeople + 1,
      ),
    // Workaround: statsig is returning the same data multiple times.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(dynamicConfigData.value)],
  );

  const { data: actors, isPending: actorsPending } = useActivityActorsBulk(targetsToReview);

  const data = useMemo(() => {
    if (!connectedAddress) {
      return actors;
    }

    return actors
      ?.filter((actor) => !isAddressEqualSafe(actor.primaryAddress, connectedAddress))
      .slice(0, numberOfPeople);
  }, [actors, connectedAddress, numberOfPeople]);

  // If wallet is connecting, wait for that to finish before rendering profiles.
  // This prevents self from showing in the list momentarily then disappearing.
  const isPending = actorsPending && connectedAddressStatus !== 'connecting';

  return { data, isPending };
}

export function useInteractedWith(): {
  data: RecentInteractionActivityActor[] | undefined;
  isPending: boolean;
} {
  const { status: connectedAddressStatus, connectedAddress } = useCurrentUser();
  const { data: recentInteractions } = useRecentInteractions(connectedAddress, 9);

  const { data: actors, isPending: actorsPending } = useActivityActorsBulk(
    parseTargets(recentInteractions?.values.map((i) => `address:${i.address}`) ?? []),
  );

  const data: RecentInteractionActivityActor[] | undefined = useMemo(() => {
    const actorsWithInteraction = actors?.map(
      (actor): RecentInteractionActivityActor => ({
        ...actor,
        interaction: recentInteractions?.values.find((i) => i.address === actor.primaryAddress),
      }),
    );

    if (!connectedAddress) {
      return actorsWithInteraction;
    }

    return actorsWithInteraction?.filter(
      (actor) => !isAddressEqualSafe(actor.primaryAddress, connectedAddress),
    );
  }, [actors, connectedAddress, recentInteractions]);

  // If wallet is connecting, wait for that to finish before rendering profiles.
  // This prevents self from showing in the list momentarily then disappearing.
  const isPending = actorsPending && connectedAddressStatus !== 'connecting';

  return { data, isPending };
}
