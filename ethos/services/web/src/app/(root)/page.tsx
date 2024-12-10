'use client';
import { css } from '@emotion/react';
import { useFeatureGate } from '@statsig/react-bindings';
import { Col, Flex, Row, Typography } from 'antd';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ContributorCTA } from './_feed-features/contributor-mode/contributor-cta/contributor-cta';
import { FeedProfileReviews } from './_feed-features/feed/components/feed-profile-review.component';
import { NoProfileWidget } from './_feed-features/feed/components/no-profile-widget.component';
import { FeedSidebar } from './_feed-features/feed/feed-sidebar.component';
import { Feed } from './_feed-features/feed/feed.component';
import { ONBOARDING_PENDING_SESSION_KEY } from 'constant/constants';
import { featureGates } from 'constant/feature-flags';
import { useCurrentUser } from 'contexts/current-user.context';
import { useContributionStats } from 'hooks/api/echo.hooks';
import { useSessionStorage } from 'hooks/use-storage';
import { hideOnTabletAndAboveCSS } from 'styles/responsive';

const { Title } = Typography;

export default function Page() {
  const searchParams = useSearchParams();
  const isProfileReviewSectionEnabled = useFeatureGate(featureGates.profileReviewPrompts).value;
  const { connectedProfile } = useCurrentUser();

  const [showProfileReviewsSection, setShowProfileReviewsSection] = useState(
    isProfileReviewSectionEnabled,
  );
  const [isProfileReviewSectionEmpty, setIsProfileReviewSectionEmpty] = useState(false);
  useEffect(() => {
    setShowProfileReviewsSection(isProfileReviewSectionEnabled && !isProfileReviewSectionEmpty);
  }, [isProfileReviewSectionEnabled, isProfileReviewSectionEmpty]);

  const isContributorModeEnabled = useFeatureGate(featureGates.showContributorMode).value;
  const { data: stats } = useContributionStats({
    profileId: connectedProfile?.id ?? -1,
  });
  const [, setOnboardingPendingValue] = useSessionStorage<boolean>(ONBOARDING_PENDING_SESSION_KEY);

  const firstTime = searchParams.get('first-time');

  /**
   * Set onboarding pending value to false if it's the first time user is visiting the page (first-time query param is present after onboarding)
   */
  useEffect(() => {
    if (firstTime) {
      setOnboardingPendingValue(false);
    }
  }, [firstTime, setOnboardingPendingValue]);

  return (
    <>
      <Row
        gutter={[23, 28]}
        css={css`
          margin-bottom: 16px;
          margin-top: 16px;
        `}
      >
        <Col
          xs={{ span: 24, offset: 0 }}
          md={{ span: 22, offset: 1 }}
          lg={{ span: 18, offset: 3 }}
          xl={{ span: 16, offset: 4 }}
          xxl={{ span: 16, offset: 4 }}
          css={css``}
        >
          <Title level={2}>Home</Title>
        </Col>
        {stats && isContributorModeEnabled ? (
          <Col
            xs={{ span: 24, offset: 0 }}
            md={{ span: 22, offset: 1 }}
            css={hideOnTabletAndAboveCSS}
          >
            <ContributorCTA stats={stats} />
          </Col>
        ) : null}
        {showProfileReviewsSection && (
          <Col
            xs={{ span: 24, offset: 0 }}
            md={{ span: 22, offset: 1 }}
            lg={{ span: 18, offset: 3 }}
            xl={{ span: 16, offset: 4 }}
            xxl={{ span: 16, offset: 4 }}
          >
            <FeedProfileReviews
              onNoActorsToReview={() => {
                setIsProfileReviewSectionEmpty(true);
              }}
            />
          </Col>
        )}
      </Row>
      <Row gutter={[23, 28]} css={css``}>
        <Col
          xs={{ span: 24, offset: 0 }}
          md={{ span: 14, offset: 1 }}
          lg={{ span: 12, offset: 3 }}
          xl={{ span: 11, offset: 4 }}
          xxl={{ span: 11, offset: 4 }}
        >
          <Flex gap={24} vertical>
            <Feed />
          </Flex>
        </Col>
        <Col xs={{ span: 0 }} md={{ span: 8 }} lg={{ span: 6 }} css={{ marginTop: 57.5 }}>
          <FeedSidebar />
        </Col>
      </Row>
      {!connectedProfile && <NoProfileWidget isMobile />}
    </>
  );
}
