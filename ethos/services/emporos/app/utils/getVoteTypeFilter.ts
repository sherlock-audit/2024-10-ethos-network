export const voteTypeFilters = ['all', 'trust', 'distrust'] as const;
export type VoteTypeFilter = (typeof voteTypeFilters)[number];

export function getVoteTypeFilter(type: string): VoteTypeFilter {
  return voteTypeFilters.includes(type as VoteTypeFilter) ? (type as VoteTypeFilter) : 'all';
}
