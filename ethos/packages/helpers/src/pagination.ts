export type PaginatedResponse<T> = {
  values: T[];
  total: number;
  limit: number;
  offset: number;
};

export type PaginatedQuery = {
  limit: number;
  offset: number;
};
