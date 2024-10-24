/* eslint-disable no-restricted-imports */
// helper.ts

import { convertScoreToLevel } from '@ethos/score/src/convertScore';
import { type ScoreLevel } from '@ethos/score/src/score.types';
import { ReviewFilledSvg } from '../../icons';
import { ETHOS_WEB_URL } from '../config/constants';
import { USER_AVATAR_CONTAINER_REGEX } from '../config/regex';
import { capitalize } from './text';

export const colorsMap: Record<ScoreLevel, string> = {
  untrusted: '#B72B38',
  questionable: '#CC9A1A',
  neutral: '#2D2D29',
  reputable: '#1B69B1',
  exemplary: '#127F31',
};

const neturalScoreLevel: ScoreLevel = 'neutral';

export function getColorByScore(score: number): string {
  try {
    if (isNaN(score)) {
      return colorsMap.neutral;
    }

    const scoreLevel = convertScoreToLevel(score);

    return colorsMap[scoreLevel] || colorsMap.neutral;
  } catch (error) {
    return colorsMap.neutral;
  }
}

export function getDescriptionByScore(score: number) {
  try {
    if (isNaN(score)) {
      return capitalize(neturalScoreLevel);
    }

    const scoreLevel = convertScoreToLevel(score);

    return capitalize(scoreLevel);
  } catch (error) {
    return capitalize(neturalScoreLevel);
  }
}

export async function setBackgroundColorName(): Promise<string> {
  return await new Promise((resolve) => {
    const bodyStyle = getComputedStyle(document.body);
    const backgroundColor = bodyStyle.backgroundColor;

    const colorMap: Record<string, string> = {
      'rgb(0, 0, 0)': 'dark',
      'rgb(255, 255, 255)': 'light',
      'rgb(21, 32, 43)': 'dim',
    };

    const bgColor = colorMap[backgroundColor] || 'unknown';
    resolve(bgColor);
  });
}

export function updateColorThemeOnDocChange(callback: (colorName: string) => void): void {
  const resolveBackgroundColorName = (backgroundColor: string): string => {
    const colorMap: Record<string, string> = {
      'rgb(0, 0, 0)': 'dark',
      'rgb(255, 255, 255)': 'light',
      'rgb(21, 32, 43)': 'dim',
    };

    return colorMap[backgroundColor] || 'unknown';
  };

  const mutationCallback: MutationCallback = (mutationsList: MutationRecord[]) => {
    for (const mutation of mutationsList) {
      if (mutation.attributeName === 'style') {
        const backgroundColor = getComputedStyle(document.body).backgroundColor;
        const colorName = resolveBackgroundColorName(backgroundColor);
        callback(colorName);
      }
    }
  };

  const observer = new MutationObserver(mutationCallback);

  const config: MutationObserverInit = {
    attributes: true,
    attributeFilter: ['style'],
    attributeOldValue: false,
  };

  observer.observe(document.body, config);
}

export function extractHandleId(avatarContainer: HTMLElement): string {
  // Method 1: Try to find the <credibility-score-pooling-helper.ts> element within the avatar container and extract the handle ID from the href attribute
  const linkElement = avatarContainer.querySelector(
    'credibility-score-pooling-helper.ts[href*="/"]',
  );

  if (linkElement?.getAttribute('href')) {
    const href = linkElement.getAttribute('href');
    const handleId = href?.substring(href.lastIndexOf('/') + 1);

    if (handleId) {
      return handleId;
    }
  }

  // Method 2: Try to extract the handle ID directly from the outerHTML of the avatar container
  const html = avatarContainer.outerHTML;
  const start = html.indexOf('href="/') + 7;

  if (start > 6) {
    const handleId = html.substring(start, html.indexOf('"', start));

    if (handleId) {
      return handleId;
    }
  }

  // Method 3: Try to find the element with credibility-score-pooling-helper.ts specific class and extract the handle ID from the data-testid attribute
  const handleElement1 = avatarContainer.querySelector<HTMLElement>(
    '[class="css-175oi2r r-bztko3 r-1adg3ll"]',
  );

  if (handleElement1) {
    const dataTestId = handleElement1.getAttribute('data-testid');
    const match = dataTestId?.match(USER_AVATAR_CONTAINER_REGEX);

    if (match?.[1]) {
      return match[1];
    }
  }

  // Method 4: Try to find the element with credibility-score-pooling-helper.ts different specific class and extract the handle ID from the data-testid attribute
  const handleElement2 = avatarContainer.querySelector<HTMLElement>(
    '[class="css-175oi2r r-1adg3ll r-bztko3 feed-avatar-inner-border"]',
  );

  if (handleElement2) {
    const dataTestId = handleElement2.getAttribute('data-testid');
    const match = dataTestId?.match(USER_AVATAR_CONTAINER_REGEX);

    if (match?.[1]) {
      return match[1];
    }
  }

  // Method 5: Try to find the element with another specific class and extract the handle ID from the data-testid attribute
  const handleElement3 = avatarContainer.querySelector<HTMLElement>(
    '[data-testid*="UserAvatar-Container-"]',
  );

  if (handleElement3) {
    const dataTestId = handleElement3.getAttribute('data-testid');
    const match = dataTestId?.match(USER_AVATAR_CONTAINER_REGEX);

    if (match?.[1]) {
      return match[1];
    }
  }

  // Method 6: Apply borders and extract the handle ID from data-testid attribute
  const applyBorders = (avatarContainer: HTMLElement) => {
    avatarContainer.classList.remove('ethos-avatar-outer-border', 'rounded', 'square');
    avatarContainer.style.border = '';

    const requiredClasses = [
      'css-175oi2r',
      'r-1adg3ll',
      'r-bztko3',
      'r-16l9doz',
      'r-6gpygo',
      'r-2o1y69',
      'r-1v6e3re',
      'r-1xce0ei',
    ];

    if (requiredClasses.every((cls) => avatarContainer.classList.contains(cls))) {
      avatarContainer.classList.add('ethos-avatar-container');

      const isSquareAvatar =
        avatarContainer.querySelector('[style*="clip-path: url(\\"#shape-square\\")"]') !== null;
      const dataTestId = avatarContainer.getAttribute('data-testid');
      const match = dataTestId?.match(USER_AVATAR_CONTAINER_REGEX);

      if (match?.[1]) {
        return match[1];
      }

      avatarContainer.classList.add('ethos-avatar-outer-border');
      avatarContainer.classList.add(isSquareAvatar ? 'square' : 'rounded');
    }
  };

  applyBorders(avatarContainer);

  // Return an empty string if no handle ID is found using any method
  return '';
}

export function isValuePlaceholder(value: string): boolean {
  return value === '_';
}

export const spinner = '<span class="loading-bar"></span>';
export const spinnerFull = '<span class="loading-bar" style="width: 100%"></span>';

type WriteReviewLinkProps =
  | {
      ethAddress: string;
    }
  | {
      handleId: string;
    };

export function getWriteReviewLink(props: WriteReviewLinkProps): HTMLAnchorElement {
  const writeReview = document.createElement('a');
  const link = new URL(
    'ethAddress' in props ? `/profile/${props.ethAddress}` : `/profile/x/${props.handleId}`,
    ETHOS_WEB_URL,
  );

  link.searchParams.append('modal', 'review');
  link.searchParams.append('source', 'twitter-chrome-extension');
  writeReview.href = link.toString();
  writeReview.className = 'write-review-link';
  writeReview.target = '_blank';
  writeReview.innerHTML = `
              ${ReviewFilledSvg({ className: 'write-review-icon' })}
              <span>Write a review</span>
          `;

  return writeReview;
}
