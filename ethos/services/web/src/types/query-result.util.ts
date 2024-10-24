import { type UseQueryResult } from '@tanstack/react-query';

export type ExtractUseQueryResult<T extends (...args: any) => UseQueryResult> =
  ReturnType<T> extends UseQueryResult<infer O> ? NonNullable<O> : never;
