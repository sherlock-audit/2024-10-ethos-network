import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { Logo } from '@ethos/common-ui';
import { formatDate, capitalize } from '@ethos/helpers';
import { convertScoreToLevel } from '@ethos/score';
import { useFeatureGate } from '@statsig/react-bindings';
import { Typography, Table, theme, type TableProps, Tag, Button } from 'antd';
import { useParams } from 'next/navigation';
import { type Address } from 'viem';
import { ScoreElementIcon } from './score-element-icons.component';
import { ScoreHistoryMetadata } from './score-history-metadata.component';
import { getTxnURL } from 'app/(root)/activity/_components/view.txn.component';
import { OpenInNewIcon } from 'components/icons';
import { LottieLoader } from 'components/loading-wrapper/lottie-loader.component';
import { tokenCssVars } from 'config/theme';
import { featureGates } from 'constant/feature-flags';
import { useScoreHistoryDetails } from 'hooks/user/lookup';
import { getColorFromScoreLevel } from 'utils/score';

const { useToken } = theme;

export function ScoreHistoryLedger() {
  const { token } = useToken();
  const { address } = useParams<{ address: Address }>();
  const { data: history, isLoading } = useScoreHistoryDetails({ address });

  const isScoreMetadataEnabled = useFeatureGate(featureGates.showScoreMetadata).value;

  type ScoreHistoryRecord = NonNullable<typeof history>['values'][number];

  if (!history || !Array.isArray(history.values)) {
    // TODO: Add empty state
    return <div>No score history available</div>;
  }

  const dataSource = attachUniqueIds(filterHistoryValues(history.values));

  /**
   * Filter history to only show records where the score changed
   * Used to prevent displaying score change: 0
   */
  function filterHistoryValues(values: ScoreHistoryRecord[]) {
    if (values.length === 0) return values;

    // Always keep the most recent record
    const filtered = [values[0]];

    // Add records only when there's a score change
    for (let i = 0; i < values.length - 1; i++) {
      const currentScore = values[i].score;
      const nextScore = values[i + 1].score;

      if (currentScore !== nextScore) {
        filtered.push(values[i + 1]);
      }
    }

    return filtered;
  }

  /**
   * Attaches a unique ID to each history record
   * because each row requires a unique key
   */
  function attachUniqueIds(
    values: ScoreHistoryRecord[],
  ): Array<ScoreHistoryRecord & { id: string }> {
    return values.map((record, index) => ({
      ...record,
      id: `index-${index}`,
    }));
  }

  function renderDate(date: Date) {
    return (
      <Typography.Text>
        {formatDate(date, { dateStyle: 'short', timeStyle: 'short' })}
      </Typography.Text>
    );
  }

  function renderScore(score: number) {
    return (
      <Tag color={tokenCssVars.colorBgElevated}>
        <Typography.Text
          strong
          css={css`
            color: ${getColorFromScoreLevel(convertScoreToLevel(score), token)};
          `}
        >
          {score.toFixed(0)} <Logo css={css({ fontSize: `${token.fontSizeSM}px` })} />
        </Typography.Text>
      </Tag>
    );
  }

  function renderScoreChange(_: unknown, record: ScoreHistoryRecord, index: number) {
    const previousScore = dataSource[index + 1]?.score;

    if (!previousScore) return null;

    const change = record.score - previousScore;

    return (
      <Tag color={tokenCssVars.colorBgElevated}>
        <Typography.Text strong type={change >= 0 ? 'success' : 'danger'}>
          {change >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}{' '}
        </Typography.Text>
        <Typography.Text strong>
          {Math.abs(change).toFixed(0)} <Logo />
        </Typography.Text>
      </Tag>
    );
  }

  function renderScoreElement(
    scoreElement: NonNullable<ScoreHistoryRecord['ScoreHistoryElement']>[number]['scoreElement'],
    weightedDiff: number,
  ) {
    return (
      <span
        key={scoreElement.name}
        css={css`
          padding-block: ${token.paddingSM / 2}px;
        `}
      >
        <Tag
          icon={<ScoreElementIcon name={scoreElement.name} />}
          color={tokenCssVars.colorBgElevated}
          css={css`
            padding-block: ${token.paddingSM / 2}px;
            margin-bottom: 8px;
            color: ${tokenCssVars.colorText};
            font-weight: 600;
          `}
        >
          <Typography.Text>
            {capitalize(String(scoreElement.name).toLowerCase())}:
            <Typography.Text type={weightedDiff >= 0 ? 'success' : 'danger'} strong>
              {' '}
              {weightedDiff >= 0 ? '+' : ''}
              {weightedDiff.toFixed(0)}
            </Typography.Text>
          </Typography.Text>
        </Tag>
        <ScoreHistoryMetadata metadata={scoreElement.metadata} elementName={scoreElement.name} />
        <br />
      </span>
    );
  }

  function renderDetails(_: unknown, record: ScoreHistoryRecord, rowIndex: number) {
    if (!record.ScoreHistoryElement?.length || !history?.values) return null;

    const elements = record.ScoreHistoryElement.map(({ scoreElement }, elementIndex) => {
      const previousElement =
        history.values[rowIndex + 1]?.ScoreHistoryElement?.[elementIndex]?.scoreElement;
      const previousWeighted = previousElement ? previousElement.weighted : 0;
      const weightedDiff = scoreElement.weighted - previousWeighted;

      if (weightedDiff === 0) return null;

      return renderScoreElement(scoreElement, weightedDiff);
    });

    if (isScoreMetadataEnabled && record.txHash) {
      const txn = (
        <Button
          type="link"
          size="small"
          icon={<OpenInNewIcon />}
          css={css`
            color: ${tokenCssVars.colorPrimary};
            background-color: ${tokenCssVars.colorBgElevated};
          `}
          onClick={() => record.txHash && window.open(getTxnURL(String(record.txHash)), '_blank')}
        >
          View transaction
        </Button>
      );

      return <div>{[...elements, txn]}</div>;
    }

    return <div>{elements}</div>;
  }

  const columns: TableProps<ScoreHistoryRecord & { id: string }>['columns'] = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: renderDate,
      onHeaderCell: () => ({ style: { paddingLeft: `${token.padding}px`, height: '54px' } }),
      onCell: () => ({ style: { paddingLeft: `${token.padding}px` } }),
    },
    {
      title: 'Score',
      dataIndex: 'score',
      key: 'score',
      render: renderScore,
    },
    {
      title: 'Change',
      key: 'change',
      render: renderScoreChange,
    },
    {
      title: 'Details',
      key: 'details',
      render: renderDetails,
      onCell: () => ({ style: { paddingRight: `${token.padding}px` } }),
    },
  ];

  return (
    <>
      <Typography.Title level={3}>Score history</Typography.Title>
      <Table<ScoreHistoryRecord & { id: string }>
        columns={columns}
        dataSource={dataSource}
        loading={
          isLoading
            ? {
                indicator: <LottieLoader />,
                tip: 'Loading score history...',
              }
            : false
        }
        pagination={false}
        showHeader={true}
        size="small"
        rowKey="id"
      />
    </>
  );
}
