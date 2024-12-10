export type CacheConfig = {
  key: (...args: Array<string | number>) => string;
  ttl: number;
  get: <T>(...args: any[]) => Promise<T | null>;
  set: (...args: any[]) => Promise<void>;
  delete: (...args: any[]) => Promise<void>;
};
