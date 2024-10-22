'use client';
import { useLockBodyScroll } from '@custom-react-hooks/use-lock-body-scroll';
import { css } from '@emotion/react';
import { useFeatureGate } from '@statsig/react-bindings';
import { Col, Flex, Row, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { ContributorCTA } from './_feed-features/contributor-mode/contributor-cta.component';
import { FeedProfileReviews } from './_feed-features/feed/components/feed-profile-review.component';
import { FeedSidebar } from './_feed-features/feed/feed-sidebar.component';
import { Feed } from './_feed-features/feed/feed.component';
import { featureGates } from 'constant/feature-flags';
import { useContributorMode } from 'contexts/contributor-mode.context';
import { useConnectedAddressHasProfile } from 'hooks/user/utils';

const { Title } = Typography;

export default function Page() {
  const isProfileReviewSectionEnabled = useFeatureGate(featureGates.profileReviewPrompts).value;
  const isContributorModeEnabled = useFeatureGate(featureGates.showContributorMode).value;
  const hasProfile = useConnectedAddressHasProfile();

  const [showProfileReviewsSection, setShowProfileReviewsSection] = useState(
    isProfileReviewSectionEnabled,
  );
  const [isProfileReviewSectionEmpty, setIsProfileReviewSectionEmpty] = useState(false);
  useEffect(() => {
    setShowProfileReviewsSection(isProfileReviewSectionEnabled && !isProfileReviewSectionEmpty);
  }, [isProfileReviewSectionEnabled, isProfileReviewSectionEmpty]);

  const { isContributorModeOpen, setIsContributorModeOpen } = useContributorMode();
  useLockBodyScroll(isContributorModeOpen);

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
        {isContributorModeEnabled && hasProfile && (
          <Col
            xs={{ span: 24, offset: 0 }}
            md={{ span: 22, offset: 1 }}
            lg={{ span: 18, offset: 3 }}
            xl={{ span: 16, offset: 4 }}
            xxl={{ span: 16, offset: 4 }}
          >
            <ContributorCTA
              onClick={() => {
                setIsContributorModeOpen(true);
              }}
            />
          </Col>
        )}
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
        <Col xs={{ span: 0 }} md={{ span: 8 }} lg={{ span: 6 }} xl={{ span: 5 }} xxl={{ span: 5 }}>
          <FeedSidebar />
        </Col>
      </Row>
    </>
  );
}
