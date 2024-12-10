import { type ContributionBundleModel } from '@ethos/domain';
import { useCallback, useEffect, useMemo } from 'react';

import {
  type GetFirstPendingDetailsInput,
  getFirstPendingStepDetails,
  type GetFirstPendingDetailsOutput,
} from '../helpers/steps';
import { getContributionBundleStep } from './getContributionBundleStep';

export type GetNextPendingBundleIndex = (
  input: Omit<GetFirstPendingDetailsInput, 'contributionData' | 'onFindFail'>,
) => GetFirstPendingDetailsOutput;

export function useContributorModeSteps({
  contributionData,
  onComplete,
  setStepDetails,
}: {
  contributionData: ContributionBundleModel[];
  onComplete: () => void;
  setStepDetails: (input: { bundleIndex: number; chainedItemIndex: number }) => void;
}) {
  useEffect(() => {
    const pendingIndexes = getFirstPendingStepDetails({
      contributionData,
      startingBundleIndex: 0,
      startingChainedItemIndex: 0,
    });

    if (pendingIndexes.hasPending) {
      setStepDetails(pendingIndexes);
    } else {
      onComplete();
    }
  }, [setStepDetails, contributionData, onComplete]);

  const getNextPendingStepDetails: GetNextPendingBundleIndex = useCallback(
    (input) => {
      const nextBundleIndex = getFirstPendingStepDetails({
        ...input,
        contributionData,
        onFindFail: onComplete,
      });

      return nextBundleIndex;
    },
    [contributionData, onComplete],
  );

  const steps = useMemo(
    () =>
      contributionData.map((x) =>
        getContributionBundleStep({
          contributions: x.contributions,
          getNextPendingStepDetails,
        }),
      ),
    [contributionData, getNextPendingStepDetails],
  );

  return steps;
}
