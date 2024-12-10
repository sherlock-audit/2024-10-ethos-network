'use client';
import { type EthosUserTarget } from '@ethos/domain';
import {
  DEFAULT_STARTING_SCORE,
  convertScoreElementToCredibilityFactor,
  type ElementName,
  type ElementResult,
  type CredibilityFactor,
} from '@ethos/score';
import { Typography, Col, Row, theme, Spin, Alert, Flex } from 'antd';
import { CredibilityElementsTable } from './credibility-elements-table.component';
import { CurrentScoreCard } from './current-score-card.component';
import { ScoreHistoryLedger } from './score-history-ledger.component';
import { ScoreTips } from './score-tips.component';
import { TrendCard } from './trend-card.component';
import { UserAvatar } from 'components/avatar/avatar.component';
import { useScoreElements } from 'hooks/api/echo.hooks';
import { useActor } from 'hooks/user/activities';

const { Title } = Typography;
const { useToken } = theme;

type ScoreExplainerProps = {
  target: EthosUserTarget;
  twitterUsername?: string;
};

function byImpact(a: CredibilityFactor, b: CredibilityFactor) {
  return b.range.max - b.range.min - (a.range.max - a.range.min);
}

export function ScoreExplainer(props: ScoreExplainerProps) {
  const { token } = useToken();
  const actor = useActor(props.target);

  const scoreElementRequest = useScoreElements(props.target);

  if (scoreElementRequest.isPending) return <Spin size="large" />;
  if (!scoreElementRequest) return <Alert message="Unable to load score elements" type="error" />;
  if (scoreElementRequest.error)
    return <Alert message="Error loading score elements" type="error" />;

  const scoreElements: Record<ElementName, ElementResult> = scoreElementRequest.data ?? {};
  const credibilityFactors: CredibilityFactor[] = Object.entries(scoreElements)
    .map(([_, value]) => {
      return convertScoreElementToCredibilityFactor(value.element, value.raw);
    })
    .sort(byImpact);

  const baseScore = DEFAULT_STARTING_SCORE;
  const totalScore =
    baseScore + credibilityFactors.reduce((sum, factor) => sum + factor.weighted, 0);

  const tips = [
    {
      title: 'Get more vouches.',
      description: 'You need more unique vouchers from multiple users to get a higher score.',
      isHighImpact: true,
    },
    {
      title: 'Have vouches reciprocated.',
      description:
        'If you and another user vouch for each other, you will get a boost to your credibility score.',
    },
    {
      title: 'Get more positive reviews.',
      description:
        'Positive reviews from other credible users can go a long way in increasing your credibility score.',
    },
  ];

  return (
    <Flex vertical gap={token.margin}>
      <Row>
        <Flex gap={12}>
          <UserAvatar actor={actor} size={32} showScore={false} />
          <Title level={3}>{actor.name}&apos;s score breakdown</Title>
        </Flex>
      </Row>
      <Row gutter={[token.margin, token.margin]}>
        <Col xs={24} sm={24} md={12} lg={12} xl={12}>
          <CurrentScoreCard totalScore={totalScore} />
        </Col>
        <Col xs={24} sm={24} md={12} lg={12} xl={12}>
          <TrendCard target={props.target} />
        </Col>
      </Row>
      <ScoreTips tips={tips} />
      <CredibilityElementsTable
        baseScore={baseScore}
        credibilityFactors={credibilityFactors}
        totalScore={totalScore}
      />
      <ScoreHistoryLedger />
    </Flex>
  );
}
