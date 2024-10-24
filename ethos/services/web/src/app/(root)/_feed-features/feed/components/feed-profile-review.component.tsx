'use client';
import { css } from '@emotion/react';
import { Card, Col, Row, Typography } from 'antd';
import { useEffect } from 'react';
import { ReviewFilled } from 'components/icons';
import { LoadingWrapper } from 'components/loading-wrapper/loading-wrapper.component';
import { ProfileReviewCard } from 'components/profile-review-card/profile-review-card.component';
import { usePeopleToReview } from 'hooks/api/related-profiles.hooks';

type FeedProfileReviewProps = {
  onNoActorsToReview?: () => void;
};

export function FeedProfileReviews({ onNoActorsToReview }: FeedProfileReviewProps) {
  const { data: actorsToReview, isPending: isLoadingProfiles } = usePeopleToReview();

  useEffect(() => {
    if (!isLoadingProfiles && !actorsToReview?.length) {
      onNoActorsToReview?.();
    }
  }, [isLoadingProfiles, actorsToReview, onNoActorsToReview]);

  return (
    <Card>
      <Row
        gutter={[6, 4]}
        align="middle"
        css={css`
          margin-bottom: 14px;
        `}
      >
        <Col>
          <ReviewFilled />
        </Col>
        <Col>
          <Typography.Title level={5}>People to Review</Typography.Title>
        </Col>
      </Row>
      <LoadingWrapper
        isLoading={isLoadingProfiles}
        type="loading"
        isEmpty={!actorsToReview?.length}
      >
        <Row
          wrap={false}
          gutter={{ xs: 6, sm: 8 }}
          css={css`
            overflow: hidden;
          `}
        >
          {actorsToReview?.map((actor) => (
            <Col key={actor.userkey} xs={12} sm={8} md={6} lg={4}>
              <ProfileReviewCard actor={actor} />
            </Col>
          ))}
        </Row>
      </LoadingWrapper>
    </Card>
  );
}
