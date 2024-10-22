import { type CredibilityScorePoolingHelper } from '../../data-fetching/credibility-score-pooling-helper.ts';
import { type Images } from '../../definitions/image-resources-definition.ts';
import {
  extractHandleId,
  getColorByScore,
  setBackgroundColorName,
} from '../../helpers/components-helper.ts';

enum StorageKeys {
  ShowCredibilityScoreBorders = 'isShowCredibilityScoreBorders',
  ShowCredibilityScoreLabels = 'isShowCredibilityScoreLabels',
}

let _images: Images;
let _credibilityHelper: CredibilityScorePoolingHelper;

let isShowScoreBorders: boolean;
let isShowScoreLabels: boolean;

export function initializeFeedProfileCredibility(
  images: Images,
  credibilityHelper: CredibilityScorePoolingHelper,
) {
  listenToStorageChanges();
  _images = images;
  _credibilityHelper = credibilityHelper;

  if (_images) console.log('Images loaded in feed-profile-credibility');

  chrome.storage.local.get(
    [StorageKeys.ShowCredibilityScoreBorders, StorageKeys.ShowCredibilityScoreLabels],
    (result) => {
      isShowScoreBorders = result[StorageKeys.ShowCredibilityScoreBorders] as boolean;
      isShowScoreLabels = result[StorageKeys.ShowCredibilityScoreLabels] as boolean;

      setLabelsVisibility(isShowScoreLabels);
      setBordersVisibility(isShowScoreBorders);
    },
  );
  updateColorThemeOnDocChange();
}

function listenToStorageChanges() {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      if (changes[StorageKeys.ShowCredibilityScoreBorders] !== undefined) {
        isShowScoreBorders = changes[StorageKeys.ShowCredibilityScoreBorders].newValue;
        setBordersVisibility(isShowScoreBorders);
      }
      if (changes[StorageKeys.ShowCredibilityScoreLabels] !== undefined) {
        isShowScoreLabels = changes[StorageKeys.ShowCredibilityScoreLabels].newValue;
        setLabelsVisibility(isShowScoreLabels);
      }
    }
  });
}

function setBordersVisibility(isVisible: boolean | undefined) {
  if (isVisible) {
    setBackgroundColorName().then((bgColor) => {
      addAvatarBorders(bgColor);
    });
  } else {
    removeAvatarBorders();
  }
  visibilityStateChangeHandler();
  addTweetAvatarGap();
}

function setLabelsVisibility(isVisible: boolean | undefined) {
  if (isVisible) {
    setBackgroundColorName().then((bgColor) => {
      addAvatarLabels(bgColor);
    });
  } else {
    removeAvatarLabels();
  }
  visibilityStateChangeHandler();
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

function addAvatarBorders(bgColor: string) {
  let innerBorderColour = '';

  if (bgColor === 'dark') {
    innerBorderColour = 'black';
  } else if (bgColor === 'dim') {
    innerBorderColour = '#16202B';
  } else if (bgColor === 'light') {
    innerBorderColour = 'white';
  }

  const style = document.createElement('style');
  style.innerHTML = `
        .feed-avatar-main-container {
            margin-bottom: 20px;
        }

        .feed-avatar-outer-border {
            border-radius: 50%;
            position: relative;
            border: 3px solid gray;
        }

        .feed-avatar-inner-border {
            border: 3px solid ${innerBorderColour};
            border-radius: 50%;
        }

        .feed-avatar-square-outer-border {
            border-radius: 6px;
            border: 3px solid gray;
        }

        .feed-avatar-square-inner-border {
            border: 3px solid ${innerBorderColour};
            border-radius: 6px;
        }
    `;
  document.head.appendChild(style);

  const addBorders = async () => {
    if (!isShowScoreBorders) return;
    const avatarContainers = document.querySelectorAll<HTMLElement>(
      '[data-testid="Tweet-User-Avatar"]',
    );

    for (const avatarContainer of avatarContainers) {
      if (!avatarContainer.classList.contains('r-1gs4q39')) {
        avatarContainer.classList.add('feed-avatar-main-container');
      }

      const handleId = extractHandleId(avatarContainer);
      const outerAvatarDiv = avatarContainer.children[0] as HTMLElement;
      const innerAvatarDiv = outerAvatarDiv.children[0] as HTMLElement;
      const isSquareAvatar =
        outerAvatarDiv.querySelector('[style*="clip-path: url(\\"#shape-square\\")"]') !== null;

      if (outerAvatarDiv.classList.contains('ethos-processed-border')) {
        continue;
      }
      outerAvatarDiv.classList.add('ethos-processed-border');

      if (isSquareAvatar) {
        outerAvatarDiv.classList.add('feed-avatar-square-outer-border');
        innerAvatarDiv.classList.add('feed-avatar-square-inner-border');
      } else {
        outerAvatarDiv.classList.add('feed-avatar-outer-border');
        innerAvatarDiv.classList.add('feed-avatar-inner-border');
      }

      try {
        const credibilityScore = await _credibilityHelper.fetchValue(handleId);
        const color = getColorByScore(credibilityScore);
        outerAvatarDiv.style.border = `3px solid ${color}`;
      } catch (error) {
        console.error(`Error fetching credibility score for handle ${handleId}:`, error);
      }
    }
  };

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        addBorders();
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

  addBorders();
}

function removeAvatarBorders() {
  const avatarContainers = document.querySelectorAll<HTMLElement>(
    '[data-testid="Tweet-User-Avatar"] .ethos-processed-border',
  );
  avatarContainers.forEach((avatarContainer) => {
    avatarContainer.classList.remove(
      'feed-avatar-main-container',
      'ethos-processed-border',
      'feed-avatar-outer-border',
      'feed-avatar-square-outer-border',
    );
    const innerAvatarDiv = avatarContainer.children[0] as HTMLElement;
    innerAvatarDiv.classList.remove('feed-avatar-inner-border', 'feed-avatar-square-inner-border');
    avatarContainer.style.border = ''; // Remove inline style
  });
}

function addAvatarLabels(bgColor: string) {
  let borderColor = '';

  if (bgColor === 'dark') {
    borderColor = 'black';
  } else if (bgColor === 'dim') {
    borderColor = '#16202B';
  } else if (bgColor === 'light') {
    borderColor = 'white';
  }

  const style = document.createElement('style');
  style.innerHTML = `
        .feed-credibility-badge-wrapper {
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

        .feed-credibility-badge-container {
            height: 16px;
            min-width: 48px;
            display: flex;
            justify-content: center;
            gap: 3px;
            align-items: center;
            border: 4px solid ${borderColor};
            border-radius: 30px;
        }

        .feed-credibility-badge-point {
            font-size: 10px;
            font-weight: 400;
            color: #F0F0EE;
            line-height: 11px;
            font-family: 'Inter', sans-serif;
            padding-top: 1px;
            max-width: 40px;
            overflow: hidden;
        }

        .feed-credibility-badge-icon {
            width: 8px;
            height: 8px;
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
  document.head.appendChild(style);

  const addLabels = async () => {
    if (!isShowScoreLabels) return;

    const avatarContainers = document.querySelectorAll<HTMLElement>(
      '[data-testid="Tweet-User-Avatar"]',
    );

    for (const avatarContainer of avatarContainers) {
      if (avatarContainer.classList.contains('r-1gs4q39')) {
        continue;
      }

      const handleId = extractHandleId(avatarContainer);
      const outerAvatarDiv = avatarContainer.children[0] as HTMLElement;

      if (outerAvatarDiv.classList.contains('ethos-processed-label')) {
        continue;
      }
      outerAvatarDiv.classList.add('ethos-processed-label');

      const badgeContainer = document.createElement('div');
      badgeContainer.className = 'feed-credibility-badge-wrapper';
      badgeContainer.innerHTML = `
            <div class="feed-credibility-badge-container" style="background-color: gray">
                <div class="feed-credibility-badge-point"><span class="loading-bar" style="max-width: 15px;"></span></div>
                <img src=${_images.ethosWhiteLogo} alt="ethos-badge" class="feed-credibility-badge-icon"/>
            </div>
        `;
      outerAvatarDiv.appendChild(badgeContainer);

      try {
        const credibilityScore = await _credibilityHelper.fetchValue(handleId);
        badgeContainer.querySelector<HTMLElement>(
          '.feed-credibility-badge-container',
        )!.style.backgroundColor = getColorByScore(credibilityScore);
        badgeContainer.querySelector<HTMLElement>('.feed-credibility-badge-point')!.innerHTML =
          credibilityScore.toString();
      } catch (error) {
        console.error('Error fetching credibility score:', error);
      }
    }
  };

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        addLabels();
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

  addLabels();
}

function addTweetAvatarGap() {
  const style = document.createElement('style');
  style.innerHTML = `
        .tweet-avatar-gap {
            margin-right: 15px;
        }
    `;
  document.head.appendChild(style);

  const addGapToTweetAvatars = () => {
    const tweetContainers = document.querySelectorAll<HTMLElement>('[data-testid="tweet"]');

    tweetContainers.forEach((tweetContainer) => {
      const targetElement = tweetContainer.querySelector<HTMLElement>(
        '.css-175oi2r.r-18kxxzh.r-1wron08.r-onrtq4.r-1awozwy',
      );

      if (targetElement && !targetElement.classList.contains('tweet-avatar-gap')) {
        targetElement.classList.add('tweet-avatar-gap');
      }
    });
  };

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          // Only process element nodes
          const element = node as HTMLElement;

          if (element.matches('[data-testid="tweet"]')) {
            addGapToTweetAvatars();
          } else if (element.querySelector('[data-testid="tweet"]')) {
            addGapToTweetAvatars();
          }
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

  addGapToTweetAvatars();
}

function removeAvatarLabels() {
  const avatarContainers = document.querySelectorAll<HTMLElement>(
    '[data-testid="Tweet-User-Avatar"] .ethos-processed-label',
  );
  avatarContainers.forEach((avatarContainer) => {
    avatarContainer.classList.remove('ethos-processed-label');
    const badgeContainer = avatarContainer.querySelector('.feed-credibility-badge-wrapper');

    if (badgeContainer) {
      badgeContainer.remove();
    }
  });
}

function updateColorThemeOnDocChange(): void {
  // Function to resolve background color name based on the RGB value
  const resolveBackgroundColorName = (backgroundColor: string): string => {
    const colorMap: Record<string, string> = {
      'rgb(0, 0, 0)': 'dark',
      'rgb(255, 255, 255)': 'light',
      'rgb(21, 32, 43)': 'dim',
    };

    return colorMap[backgroundColor] || 'unknown';
  };

  // Callback function for observing mutations
  const callback: MutationCallback = (mutationsList: MutationRecord[]) => {
    for (const mutation of mutationsList) {
      if (mutation.attributeName === 'style') {
        const backgroundColor = getComputedStyle(document.body).backgroundColor;
        const colorName = resolveBackgroundColorName(backgroundColor);
        reAppendAvatarBorderStyle(colorName);
        reAppendAvatarLabelStyle(colorName);
      }
    }
  };

  // Create the observer instance linked to the callback function
  const observer: MutationObserver = new MutationObserver(callback);

  // Configuration for the observer (observe only style attribute changes of the body)
  const config: MutationObserverInit = {
    attributes: true,
    attributeFilter: ['style'],
    attributeOldValue: false,
  };

  // Start observing the document body for changes in the style attribute
  observer.observe(document.body, config);
}

function reAppendAvatarBorderStyle(bgColor: string) {
  let innerBorderColour = '';

  if (bgColor === 'dark') {
    innerBorderColour = 'black';
  } else if (bgColor === 'dim') {
    innerBorderColour = '#16202B';
  } else if (bgColor === 'light') {
    innerBorderColour = 'white';
  }

  const style = document.createElement('style');
  style.innerHTML = `
        .feed-avatar-inner-border {
            border: 3px solid ${innerBorderColour};
            border-radius: 50%;
        }

        .feed-avatar-square-inner-border {
            border: 3px solid ${innerBorderColour};
            border-radius: 6px;
        }

    `;
  document.head.appendChild(style);
}

function reAppendAvatarLabelStyle(bgColor: string) {
  let borderColor = '';

  if (bgColor === 'dark') {
    borderColor = 'black';
  } else if (bgColor === 'dim') {
    borderColor = '#16202B';
  } else if (bgColor === 'light') {
    borderColor = 'white';
  }

  const style = document.createElement('style');
  style.innerHTML = `
        .feed-credibility-badge-container {
            height: 16px;
            min-width: 48px;
            display: flex;
            justify-content: center;
            gap: 3px;
            align-items: center;
            border: 4px solid ${borderColor};
            border-radius: 30px;
        }
    `;
  document.head.appendChild(style);
}
