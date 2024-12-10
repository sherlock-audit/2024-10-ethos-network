import { type CredibilityScorePoolingHelper } from '../../data-fetching/credibility-score-pooling-helper.ts';
import { type Images } from '../../definitions/image-resources-definition.ts';
import {
  extractHandleId,
  getColorByScore,
  resolveBackgroundColorName,
  setBackgroundColorName,
} from '../../helpers/components-helper.ts';

enum StorageKeys {
  ShowCredibilityScoreBorders = 'isShowCredibilityScoreBorders',
  ShowCredibilityScoreLabels = 'isShowCredibilityScoreLabels',
}

let _images: Images;
let _credibilityHelper: CredibilityScorePoolingHelper;
let isShowScoreBorders = false;
let isShowScoreLabels = false;

export function initializeCellProfileCredibility(
  images: Images,
  credibilityHelper: CredibilityScorePoolingHelper,
) {
  _images = images;
  _credibilityHelper = credibilityHelper;

  listenToStorageChanges();

  chrome.storage.local.get(
    [StorageKeys.ShowCredibilityScoreBorders, StorageKeys.ShowCredibilityScoreLabels],
    (result) => {
      isShowScoreBorders = result[StorageKeys.ShowCredibilityScoreBorders] || false;
      isShowScoreLabels = result[StorageKeys.ShowCredibilityScoreLabels] || false;

      setBordersVisibility(isShowScoreBorders);
      setLabelsVisibility(isShowScoreLabels);
    },
  );

  updateColorThemeOnDocChange();
}

function listenToStorageChanges() {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      if (StorageKeys.ShowCredibilityScoreBorders in changes) {
        isShowScoreBorders = changes[StorageKeys.ShowCredibilityScoreBorders].newValue;
        setBordersVisibility(isShowScoreBorders);
      }
      if (StorageKeys.ShowCredibilityScoreLabels in changes) {
        isShowScoreLabels = changes[StorageKeys.ShowCredibilityScoreLabels].newValue;
        setLabelsVisibility(isShowScoreLabels);
      }
    }
  });
}

function setBordersVisibility(isVisible: boolean) {
  if (isVisible) {
    setBackgroundColorName().then((bgColor) => {
      addUserCellAvatarBorders(bgColor);
    });
  } else {
    removeAvatarBorders();
  }
  visibilityStateChangeHandler();
}

function setLabelsVisibility(isVisible: boolean) {
  if (isVisible) {
    setBackgroundColorName().then((bgColor) => {
      addUserCellAvatarLabels(bgColor);
    });
  } else {
    removeAvatarLabels();
  }
  visibilityStateChangeHandler();
}

function addUserCellAvatarBorders(bgColor: string) {
  const innerBorderColour = getBorderColorByTheme(bgColor);

  const style = document.createElement('style');
  style.setAttribute('data-origin', 'ethos-avatar-borders');
  style.innerHTML = generateAvatarBorderStyles(innerBorderColour);
  document.head.appendChild(style);

  async function processUserCellsForBorders() {
    if (!isShowScoreBorders) return;

    const userCells = document.querySelectorAll<HTMLElement>('[data-testid="UserCell"]');
    userCells.forEach((userCell) => {
      const avatarContainers = userCell.querySelectorAll<HTMLElement>(
        '.css-175oi2r.r-bztko3.r-1adg3ll.r-13qz1uu[style*="height: 40px;"]',
      );
      avatarContainers.forEach(async (avatarContainer) => {
        if (avatarContainer.classList.contains('ethos-custom-processed-border')) return;

        avatarContainer.classList.add('ethos-custom-processed-border');

        const outerAvatarDiv = avatarContainer.querySelector('div.r-1adg3ll.r-13qz1uu')!;
        const innerAvatarDiv = avatarContainer.querySelector(
          'div.css-175oi2r.r-1adg3ll.r-1pi2tsx.r-13qz1uu',
        )!;
        const isSquareAvatar =
          innerAvatarDiv.querySelector('[style*="clip-path: url(\\"#shape-square\\")"]') !== null;

        if (isSquareAvatar) {
          outerAvatarDiv.classList.add('cell-avatar-square-outer-border');
          innerAvatarDiv.classList.add('cell-avatar-square-inner-border');
        } else {
          outerAvatarDiv.classList.add('cell-avatar-outer-border');
          innerAvatarDiv.classList.add('cell-avatar-inner-border');
        }

        try {
          const handleId = extractHandleId(userCell);

          if (!handleId) return;

          const credibilityScore = await _credibilityHelper.fetchValue(handleId);
          const color = getColorByScore(credibilityScore);
          (outerAvatarDiv as HTMLElement).style.border = `3px solid ${color}`;
        } catch (error) {
          console.error('Error fetching credibility score:', error);
        }
      });
    });
  }

  const observer = new MutationObserver(() => {
    processUserCellsForBorders();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  processUserCellsForBorders();
}

function addUserCellAvatarLabels(bgColor: string) {
  const borderColor = getBorderColorByTheme(bgColor);

  const style = document.createElement('style');
  style.setAttribute('data-origin', 'ethos-avatar-labels');
  style.innerHTML = generateAvatarLabelStyles(borderColor);
  document.head.appendChild(style);

  async function processUserCellsForLabels() {
    if (!isShowScoreLabels) return;

    const userCells = document.querySelectorAll<HTMLElement>('[data-testid="UserCell"]');
    userCells.forEach((userCell) => {
      const avatarContainers = userCell.querySelectorAll<HTMLElement>(
        '.css-175oi2r.r-bztko3.r-1adg3ll.r-13qz1uu[style*="height: 40px;"]',
      );
      avatarContainers.forEach(async (avatarContainer) => {
        const outerAvatarDiv = avatarContainer.querySelector('div.r-1adg3ll.r-13qz1uu')!;

        if (outerAvatarDiv.classList.contains('ethos-processed-label')) return;

        outerAvatarDiv.classList.add('ethos-processed-label');

        const badgeContainer = document.createElement('div');
        badgeContainer.className = 'cell-credibility-badge-wrapper';
        badgeContainer.innerHTML = `
                    <div class="cell-credibility-badge-container" style="background-color: gray;">
                        <div class="cell-credibility-badge-point"><span class="loading-bar" style="max-width: 15px;"></span></div>
                        <img src=${_images.ethosWhiteLogo} alt="ethos-badge" class="cell-credibility-badge-icon"/>
                    </div>
                `;
        outerAvatarDiv.appendChild(badgeContainer);

        try {
          const handleId = extractHandleId(userCell);

          if (!handleId) return;

          const credibilityScore = await _credibilityHelper.fetchValue(handleId);
          const badgeContainerDiv = badgeContainer.querySelector<HTMLElement>(
            '.cell-credibility-badge-container',
          );
          const badgePointDiv = badgeContainer.querySelector<HTMLElement>(
            '.cell-credibility-badge-point',
          );

          badgeContainerDiv!.style.backgroundColor = getColorByScore(credibilityScore);
          badgePointDiv!.innerHTML = credibilityScore.toString();
        } catch (error) {
          console.error('Error fetching credibility score:', error);
        }
      });
    });
  }

  const observer = new MutationObserver(() => {
    processUserCellsForLabels();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  processUserCellsForLabels();
}

function getBorderColorByTheme(bgColor: string): string {
  switch (bgColor) {
    case 'dark':
      return 'black';
    case 'dim':
      return '#16202B';
    case 'light':
      return 'white';
    default:
      return 'gray';
  }
}

function generateAvatarBorderStyles(innerBorderColour: string): string {
  return `
        .cell-avatar-main-container {
            margin-bottom: 20px;
        }

        .cell-avatar-outer-border {
            border-radius: 50%;
            position: relative;
            border: 3px solid gray;
            top: -3px;
            left: -3px;
        }

        .cell-avatar-inner-border {
            border: 3px solid ${innerBorderColour};
            border-radius: 50%;
            width: 100%;
            height: 100%;
            box-sizing: border-box;
        }

        .cell-avatar-square-outer-border {
            border-radius: 6px;
            border: 3px solid gray;
            top: -3px;
            left: -3px;
            position: relative;
        }

        .cell-avatar-square-inner-border {
            border: 3px solid ${innerBorderColour};
            border-radius: 6px;
            width: 100%;
            height: 100%;
            box-sizing: border-box;
        }
    `;
}

function generateAvatarLabelStyles(borderColor: string): string {
  return `
        .cell-credibility-badge-wrapper {
            display: flex;
            width: 100%;
            max-width: 52px;
            height: 16px;
            justify-content: center;
            left: 0;
            position: absolute;
            bottom: -10px;
            z-index: 100;
        }

        .cell-credibility-badge-container {
            height: 16px;
            min-width: 48px;
            display: flex;
            justify-content: center;
            gap: 3px;
            align-items: center;
            border: 4px solid ${borderColor};
            border-radius: 30px;
        }

        .cell-credibility-badge-point {
            font-size: 11px;
            font-weight: 400;
            color: #F0F0EE;
            line-height: 11px;
            font-family: 'Inter', sans-serif;
            padding-top: 1px;
            max-width: 40px;
            overflow: hidden;
        }

        .cell-credibility-badge-icon {
            width: 8px;
            height: 8px;

        }

        .ethos-avatar-container {
            position: relative;
            z-index: 100;
        }

        .loading-bar {
            display: inline-block;
            width: 20px;
            height: 6px;
            background-color: rgba(255, 255, 255, 0.3);
            position: relative;
            overflow: hidden;
            opacity: 25%;
            margin-bottom: 1px;
        }

        .loading-bar::before {
            content: '';
            display: block;
            position: absolute;
            left: -100%;
            width: 100%;
            height: 100%;
            background-color: rgba(255, 255, 255, 0.3);
            animation: loading-bar 1.5s infinite;
        }

        @keyframes loading-bar {
            0% { left: -100%; }
            50% { left: 100%; }
            100% { left: 100%; }
        }
    `;
}

function visibilityStateChangeHandler() {
  chrome.storage.local.get(
    [StorageKeys.ShowCredibilityScoreBorders, StorageKeys.ShowCredibilityScoreLabels],
    (result) => {
      isShowScoreBorders = result[StorageKeys.ShowCredibilityScoreBorders] as boolean;
      isShowScoreLabels = result[StorageKeys.ShowCredibilityScoreLabels] as boolean;

      if (!isShowScoreBorders) {
        removeAvatarBorders();
      }
      if (!isShowScoreLabels) {
        removeAvatarLabels();
      }
    },
  );
}

function removeAvatarBorders() {
  // Select all elements that have been processed and might have borders applied
  const avatarContainers = document.querySelectorAll<HTMLElement>('.ethos-custom-processed-border');

  avatarContainers.forEach((container) => {
    // Remove all border-related classes
    container.classList.remove(
      'cell-avatar-outer-border',
      'cell-avatar-square-outer-border',
      'cell-avatar-inner-border',
      'cell-avatar-square-inner-border',
      'ethos-custom-processed-border', // Removing any additional processing classes
    );

    // Access the outer and inner divs to ensure all border styles are removed
    const outerAvatarDiv = container.querySelector<HTMLElement>('.r-1adg3ll.r-13qz1uu');
    const innerAvatarDiv = container.querySelector<HTMLElement>(
      '.css-175oi2r.r-1adg3ll.r-1pi2tsx.r-13qz1uu',
    );

    if (outerAvatarDiv) {
      outerAvatarDiv.classList.remove(
        'cell-avatar-outer-border',
        'cell-avatar-square-outer-border',
      );
      outerAvatarDiv.style.border = ''; // Remove any inline border style
    }

    if (innerAvatarDiv) {
      innerAvatarDiv.classList.remove(
        'cell-avatar-inner-border',
        'cell-avatar-square-inner-border',
      );
      innerAvatarDiv.style.border = ''; // Remove any inline border style
    }
  });

  // Remove dynamically injected style elements related to avatar borders
  const styleElements = document.querySelectorAll<HTMLStyleElement>(
    'style[data-origin="ethos-avatar-borders"]',
  );
  styleElements.forEach((styleElement) => {
    styleElement.remove();
  });
}

function removeAvatarLabels() {
  const labelContainers = document.querySelectorAll<HTMLElement>('.ethos-processed-label');
  labelContainers.forEach((container) => {
    container.classList.remove('ethos-processed-label');
    const badgeContainers = container.querySelectorAll('.cell-credibility-badge-wrapper');
    badgeContainers.forEach((badge) => {
      badge.remove();
    });
  });

  const styleElements = document.querySelectorAll<HTMLStyleElement>(
    'style[data-origin="ethos-avatar-labels"]',
  );
  styleElements.forEach((styleElement) => {
    styleElement.remove();
  });
}

function updateColorThemeOnDocChange(): void {
  const observer = new MutationObserver(() => {
    const backgroundColor = getComputedStyle(document.body).backgroundColor;
    const colorName = resolveBackgroundColorName(backgroundColor);
    reAppendAvatarBorderStyle(colorName);
    reAppendAvatarLabelStyle(colorName);
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['style'],
  });
}

function reAppendAvatarBorderStyle(bgColor: string) {
  const innerBorderColour = getBorderColorByTheme(bgColor);
  const style = document.createElement('style');
  style.setAttribute('data-origin', 'ethos-avatar-borders');
  style.innerHTML = generateAvatarBorderStyles(innerBorderColour);
  document.head.appendChild(style);
}

function reAppendAvatarLabelStyle(bgColor: string) {
  const borderColor = getBorderColorByTheme(bgColor);
  const style = document.createElement('style');
  style.setAttribute('data-origin', 'ethos-avatar-labels');
  style.innerHTML = generateAvatarLabelStyles(borderColor);
  document.head.appendChild(style);
}
