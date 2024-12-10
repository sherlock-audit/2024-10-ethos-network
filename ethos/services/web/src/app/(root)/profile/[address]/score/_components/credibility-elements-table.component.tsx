import { css } from '@emotion/react';
import { type CredibilityFactor } from '@ethos/score';
import { Typography, Table, theme, type TableProps } from 'antd';
import { ElementProgress } from './element-progress.component';

const { useToken } = theme;

type CredibilityElementsTableProps = {
  baseScore: number;
  credibilityFactors: CredibilityFactor[];
  totalScore: number;
};

type TableDataItem = {
  key: string;
  name: string;
  value?: number;
  weighted?: number;
  range?: { min: number; max: number };
  total: number;
  baseScore?: number;
  isBase?: boolean;
  isTotal?: boolean;
};

export function CredibilityElementsTable({
  baseScore,
  credibilityFactors,
  totalScore,
}: CredibilityElementsTableProps) {
  const { token } = useToken();

  const tableData: TableDataItem[] = [
    {
      key: 'base',
      isBase: true,
      name: 'Base Score',
      baseScore,
      total: baseScore,
    },
    ...credibilityFactors.map((factor, index) => {
      const total =
        baseScore + credibilityFactors.slice(0, index + 1).reduce((sum, f) => sum + f.weighted, 0);

      return {
        key: factor.name,
        name: factor.name,
        value: factor.value,
        weighted: factor.weighted,
        range: factor.range,
        total,
      };
    }),
  ];

  const columns: TableProps<TableDataItem>['columns'] = [
    {
      title: 'Factor',
      dataIndex: 'name',
      key: 'name',
      width: '20%',
      render: (text: string) => <Typography.Text>{text}</Typography.Text>,
      onHeaderCell: () => ({
        style: {
          paddingLeft: `${token.padding}px`,
          height: '54px',
        },
      }),
      onCell: () => ({
        style: {
          paddingLeft: `${token.padding}px`,
        },
      }),
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      width: '5%',
      render: (_: any, record) => {
        if (record.value === undefined) return null;

        return <Typography.Text>{record.value.toFixed(0)}</Typography.Text>;
      },
    },
    {
      title: '',
      dataIndex: 'progress',
      key: 'progress',
      width: '55%',
      align: 'right' as const,
      render: (_: any, record) => {
        if (record.isBase ?? record.isTotal) return null;
        if (!record.range) return null;

        return (
          <ElementProgress
            factor={{
              name: record.name,
              value: record.value ?? 0,
              weighted: record.weighted ?? 0,
              range: record.range,
            }}
          />
        );
      },
    },
    {
      title: 'Impact',
      dataIndex: 'weighted',
      key: 'weighted',
      align: 'right' as const,
      render: (_, record) => {
        if ('isBase' in record && record.isBase) {
          return <Typography.Text strong>{record.baseScore?.toFixed(1)}</Typography.Text>;
        }

        return (
          <>
            <Typography.Text strong>{Number(record.weighted).toFixed(1)}</Typography.Text>
            <br />
            <Typography.Text type="secondary">(max: {record.range?.max})</Typography.Text>
          </>
        );
      },
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: '8%',
      align: 'right' as const,
      render: (_: any, record) => {
        if (record.isTotal) {
          return <Typography.Text>{totalScore.toFixed(1)}</Typography.Text>;
        }

        return (
          <>
            <Typography.Text strong>{record.total.toFixed(1)}</Typography.Text>
            {!record.isBase && (
              <>
                <br />
                <Typography.Text
                  type={record.weighted && record.weighted >= 0 ? 'success' : 'danger'}
                >
                  ({record.weighted && record.weighted >= 0 ? '+' : ''}
                  {record.weighted?.toFixed(1)})
                </Typography.Text>
              </>
            )}
          </>
        );
      },
      onHeaderCell: () => ({
        style: {
          paddingRight: `${token.padding}px`,
          height: '54px',
        },
      }),
      onCell: () => ({
        style: {
          paddingRight: `${token.padding}px`,
        },
      }),
    },
  ];

  return (
    <>
      <Typography.Title level={3}>Credibility elements</Typography.Title>
      <Table
        columns={columns}
        dataSource={tableData}
        pagination={false}
        showHeader={true}
        size="small"
        summary={() => (
          <Table.Summary>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} />
              <Table.Summary.Cell index={1} />
              <Table.Summary.Cell index={2} />
              <Table.Summary.Cell index={3} />
              <Table.Summary.Cell
                css={css`
                  padding-right: ${token.padding}px;
                  text-align: right;
                `}
                index={4}
              >
                <Typography.Text type="secondary">Total</Typography.Text>
                <br />
                <Typography.Text strong>{totalScore.toFixed(1)}</Typography.Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </>
  );
}
