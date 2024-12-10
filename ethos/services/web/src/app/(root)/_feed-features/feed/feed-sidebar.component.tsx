import { ExperimentFilled } from '@ant-design/icons';
import { css } from '@emotion/react';
import { pluralize } from '@ethos/helpers';
import { useFeatureGate } from '@statsig/react-bindings';
import { Badge, Flex } from 'antd';
import { type RibbonProps } from 'antd/es/badge/Ribbon';
import { useState } from 'react';
import { ContributorCTA } from '../contributor-mode/contributor-cta/contributor-cta';
import { FeedProfileCard } from './components/feed-profile-card.component';
import { JoinDiscordCta } from './components/join-discord-cta';
import { NoProfileWidget } from './components/no-profile-widget.component';
import { RecentProfilesCard } from './components/recent-profiles-card.component';
import { SidebarCard } from './components/sidebar-card.component';
import { OnboardingChecklist } from 'components/onboarding/onboarding-checklist-component';
import { tokenCssVars } from 'config/theme';
import { featureGates } from 'constant/feature-flags';
import { useCurrentUser } from 'contexts/current-user.context';
import { useContributionStats } from 'hooks/api/echo.hooks';

function OnboardingSidebar() {
  const [remainingTasks, setRemainingTasks] = useState(0);
  const { connectedProfile } = useCurrentUser();
  const profileId = connectedProfile?.id;

  return (
    <HideableRibbon
      isHidden={!profileId}
      text={
        <span
          css={css`
            color: ${tokenCssVars.colorBgLayout};
          `}
        >
          {profileId
            ? `${remainingTasks} ${pluralize(remainingTasks, 'task', 'tasks')} left`
            : null}
        </span>
      }
    >
      <div data-intercom-target="testnet-tasks">
        <SidebarCard title="Testnet tasks" icon={<ExperimentFilled />}>
          <OnboardingChecklist onCountChanged={setRemainingTasks} />
        </SidebarCard>
      </div>
    </HideableRibbon>
  );
}

export function FeedSidebar() {
  const { connectedProfile } = useCurrentUser();
  const isContributorModeEnabled = useFeatureGate(featureGates.showContributorMode).value;
  const { data: stats } = useContributionStats({
    profileId: connectedProfile?.id ?? -1,
  });

  return (
    <Flex vertical gap={24}>
      {connectedProfile ? (
        <>
          {stats && isContributorModeEnabled ? <ContributorCTA stats={stats} /> : null}
          <FeedProfileCard />
          <JoinDiscordCta />
          <OnboardingSidebar />
        </>
      ) : (
        <NoProfileWidget />
      )}
      <RecentProfilesCard />
    </Flex>
  );
}

type HideableRibbonProps = RibbonProps & { isHidden: boolean };

function HideableRibbon(props: HideableRibbonProps): JSX.Element {
  const { isHidden, children, ...ribbonProps } = props;

  // eslint-disable-next-line react/jsx-no-useless-fragment
  return isHidden ? <>{children}</> : <Badge.Ribbon {...ribbonProps}>{children}</Badge.Ribbon>;
}
