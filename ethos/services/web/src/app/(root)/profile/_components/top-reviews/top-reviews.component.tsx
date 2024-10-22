import { css } from '@emotion/react';
import { type EthosUserTarget, reviewActivity } from '@ethos/domain';
import { Col, Row } from 'antd';
import { LoadingWrapper } from 'components/loading-wrapper/loading-wrapper.component';
import { TopReviewCard } from 'components/review-card/top-review-card.component';
import { useQueryAwaitDataUpdate } from 'hooks/useWaitForQueryDataUpdate';
import { useActivityVotes, useRecentActivities, voteLookup } from 'hooks/user/activities';

type Props = {
  target: EthosUserTarget;
};

export function TopReviews({ target }: Props) {
  // TODO this API is paginated and doesn't return all reviews. We need an API that returns top reviews by user votes.
  const queryResult = useRecentActivities(target, undefined, [reviewActivity], 'subject');

  const {
    data: activitiesData,
    isPending,
    isPolling,
    isFetching,
  } = useQueryAwaitDataUpdate(queryResult, (data) => data.values?.[0]?.timestamp ?? 0, [
    'REVIEW_ADDED',
  ]);

  const activities = (activitiesData?.values ?? []).filter((activity) => {
    // TODO: Remove workaround to hide the archived reviews from the top list (implement in BE/View)
    if (activity.type === reviewActivity) {
      return !activity.data.archived;
    }

    return activity;
  });
  // this isn't strictly necessary but it ensures typescript doesn't complain about ActivityInfo -> ReviewActivityInfo
  const reviews = activities.filter((info) => info.type === reviewActivity);
  const sortedReviews =
    reviews.sort(
      (a, b) => b.votes.upvotes - b.votes.downvotes - (a.votes.upvotes - a.votes.downvotes),
    ) ?? [];
  const userVotes = useActivityVotes(voteLookup(sortedReviews)).data;

  const isActivitiesLoading = isPending || isPolling || isFetching;

  return (
    <LoadingWrapper
      type="skeletonCardThreeColumnList"
      emptyDescription="No reviews"
      isLoading={isActivitiesLoading}
      isEmpty={sortedReviews.length === 0}
    >
      <Row gutter={[24, 24]}>
        {sortedReviews.slice(0, 3).map((review) => (
          <Col
            css={css`
              display: flex;
            `}
            xs={{ span: 24 }}
            md={{ span: 12 }}
            lg={{ span: 8 }}
            key={review.data.id}
          >
            <TopReviewCard info={review} userVotes={userVotes} />
          </Col>
        ))}
      </Row>
    </LoadingWrapper>
  );
}
