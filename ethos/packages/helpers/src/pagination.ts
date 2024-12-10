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

export type BatchPaginatedResponse<K extends keyof any, T> = {
  values: T[];
  total: number;
  limit: number;
  offsets: Partial<Record<K, number>>;
  counts: Partial<Record<K, number>>;
};
