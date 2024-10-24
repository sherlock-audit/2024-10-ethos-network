import { DEFAULT_PAGE_SIZE } from 'constant/constants';
import { type PaginationParams } from 'types/pagination';

export const parsePaginationParams = (pageParams?: PaginationParams | null) => {
  const pagination = pageParams?.pagination;

  return {
    limit: pagination?.pageSize ?? DEFAULT_PAGE_SIZE,
    offset: ((pagination?.current ?? 1) - 1) * (pagination?.pageSize ?? DEFAULT_PAGE_SIZE),
  };
};
