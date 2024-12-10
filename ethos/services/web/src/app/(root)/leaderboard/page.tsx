'use client';

import { css } from '@emotion/react';
import { Col, Row, Tabs, type TabsProps, Typography } from 'antd';
import { ContributorXpLeaderboard } from './_components/contributor-xp-leaderboard.component';
import { CredibilityScoreLeaderboard } from './_components/credibility-score-leaderboard.component';

export default function Page() {
  const items: TabsProps['items'] = [
    {
      key: 'contributor',
      label: 'Contributor XP',
      children: <ContributorXpLeaderboard />,
    },
    {
      key: 'most-credible',
      label: 'Most credible',
      children: <CredibilityScoreLeaderboard />,
    },
    {
      key: 'least-credible',
      label: 'Least credible',
      children: <CredibilityScoreLeaderboard order="asc" />,
    },
  ];

  return (
    <Row>
      <Col
        xs={{ span: 24 }}
        sm={{ span: 20, offset: 2 }}
        md={{ span: 16, offset: 4 }}
        lg={{ span: 14, offset: 5 }}
      >
        <Typography.Title
          level={2}
          css={css`
            margin: 12px 0;
          `}
        >
          Leaderboard
        </Typography.Title>

        <Tabs items={items} />
      </Col>
    </Row>
  );
}
