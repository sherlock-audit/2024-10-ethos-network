import { USER_AVATAR_CONTAINER_REGEX } from '../../config/regex.ts';
import { type CredibilityScorePoolingHelper } from '../../data-fetching/credibility-score-pooling-helper.ts';
import { type Images } from '../../definitions/image-resources-definition.ts';
import { getColorByScore, setBackgroundColorName } from '../../helpers/components-helper.ts';

enum StorageKeys {
  ShowCredibilityScoreBorders = 'isShowCredibilityScoreBorders',
  ShowCredibilityScoreLabels = 'isShowCredibilityScoreLabels',
}

let _images: Images;
let _credibilityHelper: CredibilityScorePoolingHelper;
let isShowScoreBorders: boolean;
let isShowScoreLabels: boolean;

let handleId = '';

export function initializePageProfileCredibility(
  images: Images,
  credibilityHelper: CredibilityScorePoolingHelper,
) {
  _images = images;
  _credibilityHelper = credibilityHelper;
  listenToStorageChanges();
  addProfileAvatarBorder();
  updateColorThemeOnDocChange();

  let lastUrl = location.href;

  new MutationObserver(() => {
    const url = location.href;

    if (url !== lastUrl) {
      lastUrl = url;
      removeAvatarLabels();
    }
  }).observe(document, { subtree: true, childList: true });
}

function addProfileAvatarBorder() {
  chrome.storage.local.get(
    [StorageKeys.ShowCredibilityScoreBorders, StorageKeys.ShowCredibilityScoreLabels],
    (result) => {
      isShowScoreBorders = result[StorageKeys.ShowCredibilityScoreBorders] as boolean;
      isShowScoreLabels = result[StorageKeys.ShowCredibilityScoreLabels] as boolean;

      setBordersVisibility(isShowScoreBorders);
      setLabelsVisibility(isShowScoreLabels);
    },
  );
}

function setBordersVisibility(isVisible: boolean | undefined) {
  if (isVisible) {
    setBackgroundColorName().then((bgColor) => {
      addAvatarBorders(bgColor);
      visibilityStateChangeHandler();
    });
  } else {
    removeAvatarBorders();
  }
}

function setLabelsVisibility(isVisible: boolean | undefined) {
  if (isVisible) {
    setBackgroundColorName().then((bgColor) => {
      addAvatarLabels(bgColor);
      visibilityStateChangeHandler();
    });
  } else {
    removeAvatarLabels();
  }
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

function addAvatarBorders(bgColor: string) {
  let avatarOuterBorderColor = '';

  if (bgColor === 'dark') {
    avatarOuterBorderColor = 'black';
  } else if (bgColor === 'dim') {
    avatarOuterBorderColor = '#16202B';
  } else if (bgColor === 'light') {
    avatarOuterBorderColor = 'white';
  }

  const style = document.createElement('style');
  style.innerHTML = `
        .ethos-avatar-outer-border {
            position: relative;
            background: ${avatarOuterBorderColor};
        }

        .ethos-avatar-outer-border.rounded {
            border-radius: 50%;
        }

        .ethos-avatar-outer-border.square {
            border-radius: 15px;
        }
    `;
  document.head.appendChild(style);

  const applyBorders = async (avatarContainer: HTMLElement) => {
    if (!isShowScoreBorders) return;
    avatarContainer.classList.remove('ethos-avatar-outer-border', 'rounded', 'square');
    avatarContainer.style.border = '';

    if (
      [
        'css-175oi2r',
        'r-1adg3ll',
        'r-bztko3',
        'r-16l9doz',
        'r-6gpygo',
        'r-2o1y69',
        'r-1v6e3re',
        'r-1xce0ei',
      ].every((cls) => avatarContainer.classList.contains(cls))
    ) {
      avatarContainer.classList.add('ethos-avatar-container');
      const outerAvatarDiv = avatarContainer;
      const isSquareAvatar = Boolean(
        outerAvatarDiv.querySelector('[style*="clip-path: url(\\"#shape-square\\")"]'),
      );
      const dataTestId = outerAvatarDiv.getAttribute('data-testid');
      const match = dataTestId?.match(USER_AVATAR_CONTAINER_REGEX);

      if (match?.[1]) {
        handleId = match[1];
      }

      outerAvatarDiv.classList.add(
        'ethos-avatar-outer-border',
        isSquareAvatar ? 'square' : 'rounded',
      );

      try {
        const credibilityScore = await _credibilityHelper.fetchValue(handleId);
        const color = getColorByScore(credibilityScore);
        outerAvatarDiv.style.border = `5px solid ${color}`;
      } catch (error) {
        console.error('Error fetching credibility score:', error);
      }
    }
  };

  document
    .querySelectorAll<HTMLElement>('[data-testid^="UserAvatar-Container-"]')
    .forEach(async (avatarContainer) => {
      await applyBorders(avatarContainer);
    });

  const addBorders = () => {
    const avatarContainers = document.querySelectorAll<HTMLElement>(
      '[data-testid^="UserAvatar-Container"]',
    );
    avatarContainers.forEach(applyBorders);
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

  const checkInterval = 500;
  const interval = setInterval(() => {
    const avatarContainers = document.querySelectorAll<HTMLElement>(
      '[data-testid^="UserAvatar-Container"]',
    );

    if (avatarContainers.length > 0) {
      avatarContainers.forEach(applyBorders);
      clearInterval(interval);
    }
  }, checkInterval);
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
        .ethos-profile-point-badge-wrapper {
            display: flex;
            width: 100%;
            height: 20px;
            justify-content: center;
            gap: 5px;
            left: 0;
            position: absolute;
            z-index: 100;
        }

        .ethos-profile-point-badge-container {
            height: 20px;
            min-width: 70px;
            display: flex;
            justify-content: center;
            gap: 3px;
            align-items: center;
            border: 4px solid ${borderColor};
            border-radius: 30px;
        }

        .ethos-profile-badge-point {
            font-size: 13px;
            font-weight: 500;
            color: #F0F0EE;
            line-height: 13px;
            font-family: 'Inter', sans-serif;
            margin-top: 2px;
        }

        .profile-point-badge-icon {
            width: 12px;
            height: 12px;
            padding-top: 1px;
        }

        .ethos-avatar-container {
            position: relative;
            z-index: 100;
        }

        .profile-loading-bar {
            display: inline-block;
            width: 30px;
            height: 8px;
            background-color: rgba(255, 255, 255, 0.3);
            position: relative;
            overflow: hidden;
            opacity: 25%;
        }

        .profile-loading-bar::before {
            content: '';
            display: block;
            position: absolute;
            left: -100%;
            width: 100%;
            height: 100%;
            background-color: #fff;
            animation: profile-loading-bar 1.5s infinite;
        }

        @keyframes profile-loading-bar {
            0% { left: -100%; }
            50% { left: 100%; }
            100% { left: 100%; }
        }
    `;
  document.head.appendChild(style);

  const applyLabels = async (avatarContainer: HTMLElement) => {
    if (!isShowScoreLabels) return;
    if (
      [
        'css-175oi2r',
        'r-1adg3ll',
        'r-bztko3',
        'r-16l9doz',
        'r-6gpygo',
        'r-2o1y69',
        'r-1v6e3re',
        'r-1xce0ei',
      ].every((cls) => avatarContainer.classList.contains(cls))
    ) {
      avatarContainer.classList.add('ethos-avatar-container');
      const outerAvatarDiv = avatarContainer;
      const isSquareAvatar = Boolean(
        outerAvatarDiv.querySelector('[style*="clip-path: url(\\"#shape-square\\")"]'),
      );
      const dataTestId = outerAvatarDiv.getAttribute('data-testid');
      const match = dataTestId?.match(USER_AVATAR_CONTAINER_REGEX);

      if (match?.[1]) {
        const handleId = match[1];

        if (!outerAvatarDiv.querySelector('.ethos-profile-point-badge-wrapper')) {
          const badgeContainer = document.createElement('div');
          badgeContainer.className = 'ethos-profile-point-badge-wrapper';
          badgeContainer.style.bottom = isSquareAvatar ? '-8px' : '-5px';
          badgeContainer.innerHTML = `
                    <div class="ethos-profile-point-badge-container" style="background-color: gray">
                        <div class="ethos-profile-badge-point"><span class="profile-loading-bar"></span></div>
                        <img src="${_images.ethosWhiteLogo}" alt="ethos-badge" class="profile-point-badge-icon"/>
                    </div>
                `;
          outerAvatarDiv.appendChild(badgeContainer);

          try {
            const credibilityScore = await _credibilityHelper.fetchValue(handleId);
            const color = getColorByScore(credibilityScore);
            badgeContainer.querySelector<HTMLElement>(
              '.ethos-profile-point-badge-container',
            )!.style.backgroundColor = color;
            badgeContainer.querySelector<HTMLElement>('.ethos-profile-badge-point')!.innerHTML =
              credibilityScore.toString();
          } catch (error) {
            console.error('Error fetching credibility score:', error);
          }
        }
      }
    }
  };

  const addLabels = () => {
    const avatarContainers = document.querySelectorAll<HTMLElement>(
      '[data-testid^="UserAvatar-Container"]',
    );
    avatarContainers.forEach(applyLabels);
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

  const checkInterval = 500;
  const interval = setInterval(() => {
    const avatarContainers = document.querySelectorAll<HTMLElement>(
      '[data-testid^="UserAvatar-Container"]',
    );

    if (avatarContainers.length > 0) {
      avatarContainers.forEach(applyLabels);
      clearInterval(interval);
    }
  }, checkInterval);
}

function removeAvatarBorders() {
  const avatarContainers = document.querySelectorAll<HTMLElement>(
    '[data-testid^="UserAvatar-Container"]',
  );
  avatarContainers.forEach((avatarContainer) => {
    avatarContainer.classList.remove(
      'ethos-avatar-container',
      'ethos-avatar-outer-border',
      'rounded',
      'square',
    );
    avatarContainer.style.border = '';
  });
}

function removeAvatarLabels() {
  const avatarContainers = document.querySelectorAll<HTMLElement>(
    '[data-testid^="UserAvatar-Container"]',
  );
  avatarContainers.forEach((avatarContainer) => {
    const badgeContainer = avatarContainer.querySelector('.ethos-profile-point-badge-wrapper');

    if (badgeContainer) {
      badgeContainer.remove();
    }
    avatarContainer.classList.remove('ethos-avatar-container');
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
        .ethos-profile-point-badge-container {
            height: 20px;
            min-width: 70px;
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
