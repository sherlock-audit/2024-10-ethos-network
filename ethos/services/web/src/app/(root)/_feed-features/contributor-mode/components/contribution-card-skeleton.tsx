import { css } from '@emotion/react';
import { SkeletonCard } from 'components/loading-wrapper/components/skeleton-card.component';

export function ContributionCardSkeleton({ width = 350 }: { width?: number | string }) {
  return <SkeletonCard rows={9} wrapperCSS={css({ width })} />;
}
