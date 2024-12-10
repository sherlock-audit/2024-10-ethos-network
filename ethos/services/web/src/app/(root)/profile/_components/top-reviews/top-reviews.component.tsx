import { css } from '@emotion/react';
import { type EthosUserTarget, type ReviewActivityInfo, toUserKey } from '@ethos/domain';
import { Col, Row } from 'antd';
import { TopReviewCard } from 'components/activity-cards/top-review-card.component';
import { LoadingWrapper } from 'components/loading-wrapper/loading-wrapper.component';
import { useActivityVotes, useInfiniteUnifiedActivities, voteLookup } from 'hooks/user/activities';

type Props = {
  target: EthosUserTarget;
};

export function TopReviews({ target }: Props) {
  const { data, isFetching, isPending } = useInfiniteUnifiedActivities({
    target: toUserKey(target),
    direction: 'subject',
    orderBy: { field: 'votes', direction: 'desc' },
    filter: ['review'],
    excludeHistorical: true,
    pagination: { limit: 3 },
  });

  const sortedReviews = (data?.values ?? []) as ReviewActivityInfo[];
  const userVotes = useActivityVotes(voteLookup(sortedReviews)).data;

  const isActivitiesLoading = isPending || isFetching;

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
