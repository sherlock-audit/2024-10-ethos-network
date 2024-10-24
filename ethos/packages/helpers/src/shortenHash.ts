export function shortenHash(hash: string): string {
  if (!hash || hash.length <= 10) return hash;

  return hash.substring(0, 6) + '...' + hash.slice(-4);
}
