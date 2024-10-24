export function getUnreadCount(total: number | undefined, lastViewedIdx: number) {
  if (!total) return 0;

  // Adding 1 to the lastViewedIdx to account for the fact that the lastViewedIdx is 0-based
  return total - (lastViewedIdx + 1);
}
