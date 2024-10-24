import { ExperimentFilled } from '@ant-design/icons';
import { css } from '@emotion/react';
import { pluralize } from '@ethos/helpers';
import { Badge, Flex } from 'antd';
import { type RibbonProps } from 'antd/es/badge/Ribbon';
import { useState, useMemo } from 'react';
import { zeroAddress } from 'viem';
import { FeedProfileCard } from './components/feed-profile-card.component';
import { HighestScoringProfilesCard } from './components/highest-scoring-profiles-card.component';
import { JoinDiscordCta } from './components/join-discord-cta';
import { NoProfileCard, type NoProfileCardType } from './components/no-profile-card.component';
import { RecentProfilesCard } from './components/recent-profiles-card.component';
import { SidebarCard } from './components/sidebar-card.component';
import { OnboardingChecklist } from 'components/onboarding/onboarding-checklist-component';
import { tokenCssVars } from 'config';
import { useCurrentUser } from 'contexts/current-user.context';
import { usePendingInvitationsBySubject } from 'hooks/user/lookup';

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
  const { connectedAddress, status, connectedProfile, isConnectedProfileLoading } =
    useCurrentUser();
  const { data: pendingInvitations, isPending: pendingInvitationsPending } =
    usePendingInvitationsBySubject({
      address: connectedAddress ?? zeroAddress,
    });
  const pendingInvitationsCount = pendingInvitations?.length ?? 0;

  const isLoading =
    status === 'connecting' ||
    status === 'reconnecting' ||
    isConnectedProfileLoading ||
    pendingInvitationsPending;

  const noProfileType: NoProfileCardType = useMemo(() => {
    if (!connectedAddress) {
      return 'notConnected';
    }

    if (pendingInvitationsCount > 0) {
      return 'pendingInvitation';
    }

    return 'noProfile';
  }, [connectedAddress, pendingInvitationsCount]);

  return (
    <Flex vertical gap={24}>
      {connectedProfile ? (
        <>
          <FeedProfileCard />
          <JoinDiscordCta />
          <OnboardingSidebar />
        </>
      ) : (
        <NoProfileCard type={noProfileType} isLoading={isLoading} />
      )}

      <HighestScoringProfilesCard />
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
