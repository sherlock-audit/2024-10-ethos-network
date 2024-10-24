import { css } from '@emotion/react';
import { Flex, Skeleton, Table, theme } from 'antd';
import { TableWrapper } from 'components/table/TableWrapper';

export type SkeletonTableProps = {
  rows?: number;
  columns?: number;
  paginationCount?: number;
};

export function PaginationSkeleton({ count = 4 }: { count?: number }) {
  return (
    <Flex gap={16}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton.Avatar key={index} active={true} shape="square" />
      ))}
    </Flex>
  );
}
export function SkeletonTable({ rows = 10, columns = 4, paginationCount }: SkeletonTableProps) {
  const { token } = theme.useToken();
  const tableColumns = Array.from({ length: columns }).map((_, index) => ({
    title: <Skeleton.Input block active css={{ height: 36 }} />,
    dataIndex: `column-${index}`,
    key: `column-${index}`,
  }));

  const data = Array.from({ length: rows }).map((_, index) => ({
    key: index,
    ...Object.fromEntries(
      tableColumns.map((column) => [
        column.dataIndex,
        <Skeleton.Input key={column.key} block css={{ height: 20 }} size="small" />,
      ]),
    ),
  }));

  return (
    <>
      <TableWrapper
        wrapperCSS={css`
          .ant-table-wrapper .ant-table-thead > tr > th,
          .ant-table-wrapper .ant-table-thead > tr > td,
          .ant-table-wrapper .ant-table-tbody > tr > th,
          .ant-table-wrapper .ant-table-tbody > tr > td {
            padding-block: 8px;
          }
        `}
      >
        <Table columns={tableColumns} dataSource={data} pagination={false} />
      </TableWrapper>
      <Flex
        justify="end"
        css={css`
          margin-top: ${token.margin}px;
          margin-right: 40px;
        `}
      >
        <PaginationSkeleton count={paginationCount} />
      </Flex>
    </>
  );
}
