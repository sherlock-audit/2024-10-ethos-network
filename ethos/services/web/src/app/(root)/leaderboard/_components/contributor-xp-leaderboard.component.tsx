import { LeaderboardListItem } from './leaderboard-list-item.component';
import { LoadingWrapper } from 'components/loading-wrapper/loading-wrapper.component';
import { useXpLeaderboard } from 'hooks/api/echo.hooks';

export function ContributorXpLeaderboard() {
  const { data: recentActors = [], isLoading: isLoadingActors } = useXpLeaderboard();

  return (
    <LoadingWrapper isLoading={isLoadingActors} type="loading" isEmpty={!recentActors.length}>
      {recentActors.map((profile, index) => (
        <LeaderboardListItem
          key={profile.userkey}
          profile={profile}
          position={index + 1}
          value={profile.totalXp}
          valueType="xp-points"
          showAwards
        />
      ))}
    </LoadingWrapper>
  );
}
