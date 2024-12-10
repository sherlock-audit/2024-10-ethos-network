import { Table, type TableProps } from 'antd';
import { type ColumnsType } from 'antd/es/table';
import { handleInfiniteTableScroll, TableWrapper } from './TableWrapper';
import { CenteredLottieLoader } from 'components/loading-wrapper/lottie-loader.component';

type InfiniteTableProps<T> = {
  columns: ColumnsType<T>;
  dataSource?: T[];
  rowKey?: (row: T, index?: number) => React.Key;
  isLoading: boolean;
  size?: TableProps<T>['size'];
  scrollY?: number;
  fetchNextPage: () => void;
  isFetchingNewData: boolean;
};

export function InfiniteTable<T>({
  columns,
  dataSource = [],
  rowKey = (_row, index = 0) => index?.toString(),
  isLoading,
  size = 'small',
  scrollY = 500,
  fetchNextPage,
  isFetchingNewData,
}: InfiniteTableProps<T>) {
  return (
    <TableWrapper>
      <Table<T>
        columns={columns}
        dataSource={dataSource}
        rowKey={rowKey}
        footer={() => isFetchingNewData && <CenteredLottieLoader size={22} text="Loading" />}
        loading={{
          spinning: isLoading,
          style: { height: '100%', maxHeight: '100%' },
          indicator: <CenteredLottieLoader size={34} fullHeight />,
        }}
        pagination={false}
        onScroll={(e) => {
          handleInfiniteTableScroll(e, fetchNextPage);
        }}
        size={size}
        scroll={{ x: 'max-content', y: scrollY }}
        locale={{
          emptyText:
            isLoading || isFetchingNewData ? (
              <div
                css={{
                  height: '200px',
                }}
              />
            ) : undefined,
        }}
      />
    </TableWrapper>
  );
}
