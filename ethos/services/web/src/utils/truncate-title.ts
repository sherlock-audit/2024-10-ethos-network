import { MAX_TITLE_LENGTH } from 'constant/restrictions.constant';

export function truncateTitle(title: string): string {
  // TODO: why are we seeing a title with no length?
  // coming from contributor-mode/contributor-cards/review-check-card.tsx
  if (!title) {
    return '';
  }

  return title.length > MAX_TITLE_LENGTH ? title.substring(0, MAX_TITLE_LENGTH - 3) + '...' : title;
}
