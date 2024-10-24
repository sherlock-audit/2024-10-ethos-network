/**
 * Common headers used for generated Open Graph images
 * @param cacheMaxAge max-age value in seconds
 */
export function commonHeaders(cacheMaxAge: number) {
  return {
    'cache-control': `public, immutable, no-transform, max-age=${cacheMaxAge}`,
  };
}
