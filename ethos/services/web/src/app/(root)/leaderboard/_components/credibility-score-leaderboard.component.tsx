import { LeaderboardListItem } from './leaderboard-list-item.component';
import { LoadingWrapper } from 'components/loading-wrapper/loading-wrapper.component';
import { useCredibilityLeaderboard } from 'hooks/api/echo.hooks';

type Props = {
  order?: 'asc' | 'desc';
};

export function CredibilityScoreLeaderboard({ order = 'desc' }: Props) {
  const { data: recentActors = [], isLoading } = useCredibilityLeaderboard(order);

  return (
    <LoadingWrapper isLoading={isLoading} type="loading" isEmpty={!recentActors.length}>
      {recentActors.map((profile, i) => (
        <LeaderboardListItem
          key={profile.userkey}
          profile={profile}
          position={i + 1}
          value={profile.score}
          showAwards
        />
      ))}
    </LoadingWrapper>
  );
}
