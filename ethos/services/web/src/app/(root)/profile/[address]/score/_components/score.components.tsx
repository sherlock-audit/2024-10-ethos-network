'use client';
import { css } from '@emotion/react';
import { DEFAULT_STARTING_SCORE, X_SERVICE, type EthosUserTarget } from '@ethos/domain';
import {
  convertScoreElementToCredibilityFactor,
  type ElementName,
  type ElementResult,
  type CredibilityFactor,
} from '@ethos/score';
import { Typography, Col, Row, Card, theme, Button, Spin, Alert } from 'antd';
import Link from 'next/link';
import { Fragment } from 'react';
import { ElementProgress } from './element-progress.component';
import { tokenCssVars } from 'config';
import { useScoreElements } from 'hooks/api/echo.hooks';
import { useRouteTo } from 'hooks/user/hooks';

const { Title, Text, Paragraph } = Typography;
const { useToken } = theme;

// Extracted common styles
const commonStyles = {
  rightAlign: css`
    text-align: right;
  `,
  rowPadding: (token: any) => css`
    padding: ${token.padding / 4}px 0;
  `,
};

type ScoreExplainerProps = {
  target: EthosUserTarget;
  twitterUsername?: string;
};

function byImpact(a: CredibilityFactor, b: CredibilityFactor) {
  return b.range.max - b.range.min - (a.range.max - a.range.min);
}

export function ScoreExplainer(props: ScoreExplainerProps) {
  const { token } = useToken();
  const targetRouteTo = useRouteTo(
    props.twitterUsername ? { service: X_SERVICE, username: props.twitterUsername } : props.target,
  ).data;

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

  const renderRow = (content: React.ReactNode, index?: number) => (
    <Row
      css={[
        commonStyles.rowPadding(token),
        index !== undefined &&
          css`
            background-color: ${index % 2 === 0
              ? tokenCssVars.colorBgContainer
              : tokenCssVars.colorFillAlter};
          `,
      ]}
    >
      {content}
    </Row>
  );

  return (
    <Card
      css={css`
        max-width: 1600px;
        width: 100%;
        margin: 0 auto;
        padding: ${token.padding}px;
      `}
    >
      <Title level={2}>Credibility Elements</Title>
      <Paragraph>
        Dig into your credibility score to figure out how to boost your reputation.
      </Paragraph>
      {renderRow(
        <>
          <Col xs={24} sm={8}>
            <Text strong>Base Score</Text>
          </Col>
          <Col xs={16} sm={12} css={commonStyles.rightAlign}>
            <Text strong>{baseScore.toFixed(1)}</Text>
          </Col>
          <Col xs={8} sm={4} css={commonStyles.rightAlign}>
            <Text strong>{baseScore.toFixed(1)}</Text>
          </Col>
        </>,
        -1,
      )}
      {credibilityFactors.map((factor, index) => {
        const change = factor.weighted;
        const total =
          baseScore +
          credibilityFactors.slice(0, index + 1).reduce((sum, f) => sum + f.weighted, 0);

        return renderRow(
          <Fragment key={factor.name}>
            <Col xs={24} sm={8}>
              <Text strong>{factor.name}</Text>
              <br />
              <Text>{factor.value.toFixed(0)}</Text>
            </Col>
            <Col xs={16} sm={12} css={commonStyles.rightAlign}>
              <Text strong>
                {Number(factor.weighted).toFixed(1)} (max: {factor.range.max})
              </Text>
              <ElementProgress factor={factor} />
            </Col>
            <Col xs={8} sm={4} css={commonStyles.rightAlign}>
              <Text strong>{total.toFixed(1)}</Text>
              <br />
              <Text type={change >= 0 ? 'success' : 'danger'}>
                ({change >= 0 ? '+' : ''}
                {change.toFixed(1)})
              </Text>
            </Col>
          </Fragment>,
          index,
        );
      })}
      {renderRow(
        <>
          <Col xs={24} sm={20} css={commonStyles.rightAlign}>
            <Text>Total Credibility Score:</Text>
          </Col>
          <Col xs={24} sm={4} css={commonStyles.rightAlign}>
            <Text>{totalScore.toFixed(1)}</Text>
          </Col>
        </>,
      )}
      <Link href={targetRouteTo.profile} passHref>
        <Button
          type="primary"
          block
          size="small"
          css={css`
            margin-top: ${token.padding}px;
            max-width: 300px;
            display: block;
            margin-left: auto;
            margin-right: auto;
          `}
        >
          View full Ethos profile
        </Button>
      </Link>
    </Card>
  );
}
