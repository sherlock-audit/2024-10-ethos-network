import { css } from '@emotion/react';
import { scoreRanges } from '@ethos/score';
import { useState } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { FeedCard } from './components/feed-card.component';
import { FeedFilterOptions } from './components/feed-filter-options.component';
import { filterActivities, generateActivityItemUniqueKey } from './utils';
import { LoadingWrapper } from 'components/loading-wrapper/loading-wrapper.component';
import { CenteredLottieLoader } from 'components/loading-wrapper/lottie-loader.component';
import { DEFAULT_PAGE_SIZE } from 'constant/constants';
import { useActivityVotes, useInfiniteFeed, voteLookup } from 'hooks/user/activities';

export function Feed() {
  const [minActorScore, setMinActorScore] = useState(scoreRanges.reputable.min);

  const {
    data,
    isPending: isRecentActivitiesPending,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteFeed({
    pagination: { limit: DEFAULT_PAGE_SIZE, offset: 0 },
  });

  const values = data?.values;
  const userVotes = useActivityVotes(voteLookup(values ?? [])).data;

  const filteredValues = filterActivities(values ?? [], {
    minActorScore,
  });

  function handleFilterChange(newMinActorScore: number) {
    setMinActorScore(newMinActorScore);
  }

  return (
    <div>
      <FeedFilterOptions onFilterChange={handleFilterChange} />
      <LoadingWrapper
        type="skeletonCardList"
        isLoading={isRecentActivitiesPending}
        isEmpty={!filteredValues?.length}
      >
        <InfiniteScroll
          dataLength={filteredValues?.length ?? 0}
          next={fetchNextPage}
          hasMore={hasNextPage}
          loader={<CenteredLottieLoader size={22} text="Loading" />}
          css={css`
            &.infinite-scroll-component {
              display: flex;
              flex-direction: column;
              gap: 25px;
              overflow: hidden !important;
            }
          `}
        >
          {filteredValues?.map((item) => (
            <FeedCard key={generateActivityItemUniqueKey(item)} item={item} userVotes={userVotes} />
          ))}
        </InfiniteScroll>
      </LoadingWrapper>
    </div>
  );
}
