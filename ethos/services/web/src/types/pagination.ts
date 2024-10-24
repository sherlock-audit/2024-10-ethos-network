import { type GetProp, type TableProps } from 'antd';
import { type SorterResult } from 'antd/es/table/interface';

type TablePaginationConfig = Exclude<GetProp<TableProps, 'pagination'>, boolean>;

export type PaginationParams = {
  pagination?: TablePaginationConfig;
  sortField?: SorterResult<any>['field'];
  sortOrder?: SorterResult<any>['order'];
  filters?: Parameters<GetProp<TableProps, 'onChange'>>[1];
};
