import { useQueryClient } from '@tanstack/react-query';
import { Drawer, Grid, theme } from 'antd';
import { AnimatePresence } from 'framer-motion';
import { useCallback, useMemo, useState } from 'react';
import { CompletionReward } from './completion-reward';
import { ContributionStepsProvider } from './contexts/contribution-steps.context';
import { getFirstPendingStepDetails } from './helpers/steps';
import { ContributorModeSteps } from './steps/contributor-mode-steps';
import { tokenCssVars } from 'config/theme';
import { cacheKeys } from 'constant/queries/queries.constant';
import { useContributorMode } from 'contexts/contributor-mode.context';
import { useCurrentUser } from 'contexts/current-user.context';
import { useContributionByProfile, useContributionStats } from 'hooks/api/echo.hooks';

const { useBreakpoint } = Grid;

export function ContributorMode() {
  const { isContributorModeOpen, setIsContributorModeOpen } = useContributorMode();
  const [hasCompleted, setHasCompleted] = useState(false);
  const { token } = theme.useToken();
  const { md } = useBreakpoint();
  const queryClient = useQueryClient();

  const { connectedProfile: profile, isConnectedProfileLoading: isProfileLoading } =
    useCurrentUser();
  const { data: contributionBundles, isPending: isContributionLoading } = useContributionByProfile(
    profile?.id,
    ['PENDING', 'COMPLETED', 'SKIPPED'],
  );
  const isLoading = isProfileLoading || isContributionLoading;

  const hasPendingContributions = useMemo(() => {
    if (!contributionBundles) return true;

    return getFirstPendingStepDetails({ contributionData: contributionBundles })?.hasPending;
  }, [contributionBundles]);

  const { data: stats } = useContributionStats({
    profileId: profile?.id ?? -1,
  });

  const onClose = useCallback(() => {
    setIsContributorModeOpen(false);
    queryClient.invalidateQueries({
      queryKey: cacheKeys.contribution.query(profile?.id, ['PENDING', 'COMPLETED', 'SKIPPED']),
    });
    queryClient.invalidateQueries({
      queryKey: cacheKeys.contribution.stats(profile?.id, undefined),
    });
  }, [setIsContributorModeOpen, queryClient, profile?.id]);

  const onComplete = useCallback(() => {
    setHasCompleted(true);
  }, [setHasCompleted]);

  const hasNoData = !profile || !contributionBundles || !stats?.totalCount;
  const showLoading = isLoading || hasNoData;

  return (
    <Drawer
      open={isContributorModeOpen}
      closeIcon={showLoading ? undefined : null} // null will hide the close icon
      loading={showLoading}
      afterOpenChange={() => {
        setHasCompleted(false);
      }}
      onClose={showLoading ? onClose : undefined}
      placement={md ? 'right' : 'bottom'}
      styles={{
        wrapper: {
          maxWidth: token.screenSM,
          width: '100%',
          height: '100%',
          marginLeft: 'auto',
        },
        body: {
          width: '100%',
          padding: 0,
          paddingTop: 16,
          backgroundColor: tokenCssVars.colorBgLayout,
        },
        header: {
          backgroundColor: tokenCssVars.colorBgLayout,
        },
      }}
    >
      <AnimatePresence mode="wait">
        {hasCompleted || !hasPendingContributions ? (
          <CompletionReward onClose={onClose} key="completion-reward" />
        ) : (
          <ContributionStepsProvider>
            <ContributorModeSteps
              onComplete={onComplete}
              onClose={onClose}
              contributionData={contributionBundles ?? []}
              key="steps"
            />
          </ContributionStepsProvider>
        )}
      </AnimatePresence>
    </Drawer>
  );
}
