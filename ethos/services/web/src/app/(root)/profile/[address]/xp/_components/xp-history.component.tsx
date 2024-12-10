'use client';

import { InfoCircleOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { type EthosUserTarget } from '@ethos/domain';
import { type XpHistoryResponse } from '@ethos/echo-client';
import { formatXPScore, formatDate } from '@ethos/helpers';
import { Card, Col, Flex, Row, Table, Typography, theme, type TableProps, Tooltip } from 'antd';
import { capitalize } from 'lodash-es';
import { useState } from 'react';
import { UserAvatar } from 'components/avatar/avatar.component';
import { EthosStar } from 'components/icons';
import { PageLottieLoader } from 'components/loading-wrapper/lottie-loader.component';
import { tokenCssVars } from 'config/theme';
import { useContributionStats, useXpHistory } from 'hooks/api/echo.hooks';
import { useActor } from 'hooks/user/activities';
import { useProfile } from 'hooks/user/lookup';

const PAGE_SIZE = 15;

type XpHistoryItem = XpHistoryResponse['data']['values'][number];

const columns: TableProps<XpHistoryItem>['columns'] = [
  {
    title: 'Date',
    dataIndex: 'createdAt',
    key: 'createdAt',
    render: (date: Date) =>
      formatDate(date, {
        dateStyle: 'medium',
        timeStyle: 'medium',
      }),
  },
  {
    title: 'Type',
    dataIndex: 'type',
    key: 'type',
    render: (_, record) => {
      const type = record.type
        .split('_')
        .map((word: string) => capitalize(word))
        .join(' ');

      const subType =
        record.metadata && typeof record.metadata === 'object' && 'subType' in record.metadata
          ? (record.metadata as { subType: string }).subType
              .split('_')
              .map((word: string) => capitalize(word))
              .join(' ')
          : '';

      return (
        <span>
          {type}
          {subType && ` - ${subType}`}
        </span>
      );
    },
  },
  {
    title: (
      <Flex align="center" justify="flex-end" css={{ width: '100%' }}>
        Multiplier
        <Tooltip
          title={
            <span>
              XP multiplier based on contributor score level.
              <br />
              <br />
              Untrusted - 0.2x
              <br />
              Questionable - 0.5x
              <br />
              Neutral - 1x
              <br />
              Reputable - 1.2x
              <br />
              Exemplary - 1.5x
            </span>
          }
        >
          <InfoCircleOutlined
            css={css`
              color: ${tokenCssVars.colorTextTertiary};
              font-size: 14px;
              margin-left: 4px;
            `}
          />
        </Tooltip>
      </Flex>
    ),
    dataIndex: ['metadata', 'multiplier'],
    key: 'multiplier',
    align: 'right',
    render: (multiplier?: number) => (multiplier ? `${multiplier}x` : '-'),
  },
  {
    title: 'XP Earned',
    dataIndex: 'points',
    key: 'points',
    align: 'right',
    render: (points: number) => (
      <Flex gap={4} align="center" justify="flex-end">
        {formatXPScore(points)}
        <EthosStar
          css={css`
            font-size: 16px;
            color: ${tokenCssVars.orange7};
          `}
        />
      </Flex>
    ),
  },
];

const { Title } = Typography;

type XpHistoryProps = {
  target: EthosUserTarget;
};

export function XpHistory({ target }: XpHistoryProps) {
  const { token } = theme.useToken();
  const [page, setPage] = useState(1);

  const { data: xpHistory, isPending } = useXpHistory(target, PAGE_SIZE, (page - 1) * PAGE_SIZE);
  const actor = useActor(target);
  const { data: profile } = useProfile(target);

  const { data: stats } = useContributionStats({ profileId: profile?.id ?? 0 });

  if (isPending) {
    return <PageLottieLoader />;
  }

  return (
    <>
      <Row>
        <Col span={24}>
          <Flex justify="space-between">
            <Flex
              gap={12}
              css={css`
                margin-left: ${token.margin}px;
              `}
            >
              <UserAvatar actor={actor} size={32} showScore={false} />
              <Title level={3}>{actor.name}&apos;s Contributor XP History</Title>
            </Flex>
            <Title level={3} css={{ marginRight: token.margin }}>
              Total XP: {formatXPScore(stats?.totalXp ?? 0)}{' '}
              <EthosStar css={{ fontSize: '20px', color: tokenCssVars.orange7 }} />
            </Title>
          </Flex>
        </Col>
      </Row>
      <Row>
        <Col span={24}>
          <Card
            css={css`
              margin: ${token.margin}px;
              box-shadow: ${tokenCssVars.boxShadowTertiary};
            `}
          >
            <Flex vertical gap={token.marginLG}>
              <Table
                dataSource={xpHistory?.values}
                columns={columns}
                size="small"
                rowKey="id"
                pagination={{
                  current: page,
                  onChange: setPage,
                  total: xpHistory?.total,
                  pageSize: PAGE_SIZE,
                  showSizeChanger: false,
                }}
              />
            </Flex>
          </Card>
        </Col>
      </Row>
    </>
  );
}
