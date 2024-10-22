export function notEmpty<T>(v: T | null | undefined): v is T {
  return Boolean(v);
}
