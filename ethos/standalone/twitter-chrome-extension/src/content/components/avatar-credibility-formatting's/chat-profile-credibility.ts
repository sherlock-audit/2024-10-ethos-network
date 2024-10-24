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

export function initializeChatProfileCredibility(
  images: Images,
  credibilityHelper: CredibilityScorePoolingHelper,
) {
  _images = images;
  _credibilityHelper = credibilityHelper;

  if (_images) console.log('Images loaded in chat-profile-credibility');

  setBackgroundColorName().then((bgColor) => {
    addAvatarLabels(bgColor);
  });
  setBackgroundColorName().then((bgColor) => {
    addAvatarBorders(bgColor);
  });
  setBackgroundColorName().then((bgColor) => {
    addAvatarHeaderBorders(bgColor);
  });
  setBackgroundColorName().then((bgColor) => {
    addGroupChatAvatarBorder(bgColor);
  });
  setBackgroundColorName().then((bgColor) => {
    addChatMessageAvatarBorders(bgColor);
  });
  setBackgroundColorName().then((bgColor) => {
    addChatAvatarLabels(bgColor);
  });
  /* addHeaderStyles(); */
  listenToStorageChanges();
  updateColorThemeOnDocChange();
  visibilityStateChangeHandler();
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
      addAvatarHeaderBorders(bgColor);
      addGroupChatAvatarBorder(bgColor);
      addChatMessageAvatarBorders(bgColor);
    });
  } else {
    removeAvatarBorders();
  }
  visibilityStateChangeHandler();
}

function setLabelsVisibility(isVisible: boolean | undefined) {
  if (isVisible) {
    setBackgroundColorName().then((bgColor) => {
      addAvatarLabels(bgColor);
      addChatAvatarLabels(bgColor);
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
        .chat-avatar-outer-border {
            border-radius: 50%;
            position: relative;
            border: 3px solid gray;
        }

        .chat-avatar-inner-border {
            border: 3px solid ${innerBorderColour};
            border-radius: 50%;
        }

        .chat-avatar-square-outer-border {
            border-radius: 6px;
            border: 3px solid gray;
        }

        .chat-avatar-square-inner-border {
            border: 3px solid ${innerBorderColour};
            border-radius: 6px;
        }

        .chat-avatar-container {
            overflow: visible !important;
            height: 34px;
        }

        .chat-avatar-sub-container {
            margin-right: 20px;
            margin-top: -5px;
            margin-bottom: 5px;
        }

        .conversation-avatar-badges {
           top: -10px;
        }
    `;
  document.head.appendChild(style);

  const addBorders = async () => {
    if (!isShowScoreBorders) return;
    const conversationContainers = document.querySelectorAll<HTMLElement>(
      '[data-testid="conversation"]',
    );
    const conversationAvatarBadges = document.querySelectorAll<HTMLElement>(
      '[data-testid="DMConversationAvatarBadge"]',
    );

    for (const conversationContainer of conversationContainers) {
      const avatarContainers = conversationContainer.querySelectorAll<HTMLElement>(
        '[data-testid="DM_Conversation_Avatar"]',
      );
      const tweetContainers = conversationContainer.querySelectorAll<HTMLElement>(
        '.css-175oi2r.r-1adg3ll.r-1udh08x',
      );
      const subContainers = conversationContainer.querySelectorAll<HTMLElement>(
        '.css-175oi2r.r-18kxxzh.r-1wron08.r-onrtq4',
      );

      const containsAvatarBadges = Array.from(conversationAvatarBadges).some((badge) =>
        conversationContainer.contains(badge),
      );

      if (avatarContainers.length > 0 && tweetContainers.length > 0 && !containsAvatarBadges) {
        for (const avatarContainer of avatarContainers) {
          const handleId = extractHandleId(avatarContainer);
          const outerAvatarDiv = avatarContainer.children[0] as HTMLElement;
          const innerAvatarDiv = outerAvatarDiv.children[0] as HTMLElement;
          const parentDiv = avatarContainer.parentElement!;
          const isSquareAvatar =
            outerAvatarDiv.querySelector('[style*="clip-path: url(\\"#shape-square\\")"]') !== null;

          if (parentDiv.classList.contains('chat-processed-border')) {
            continue;
          }
          parentDiv.classList.add('chat-processed-border');

          parentDiv.classList.add('chat-avatar-outer-border');
          parentDiv.classList.remove('r-1pi2tsx'); // Remove the class
          innerAvatarDiv.classList.add('chat-avatar-inner-border');

          if (isSquareAvatar) {
            parentDiv.classList.add('chat-avatar-square-outer-border');
            innerAvatarDiv.classList.add('chat-avatar-square-inner-border');
          }

          try {
            const credibilityScore = await _credibilityHelper.fetchValue(handleId);
            const color = getColorByScore(credibilityScore);
            parentDiv.style.border = `3px solid ${color}`;
          } catch (error) {
            console.error('Error fetching credibility score:', error);
            // Optionally handle error, e.g., set credibility-score-pooling-helper.ts default border color
            // parentDiv.style.border = '3px solid red';
          }
        }

        for (const tweetContainer of tweetContainers) {
          tweetContainer.classList.add('chat-avatar-container');
        }

        const divsToRemovePadding = conversationContainer.querySelectorAll<HTMLElement>(
          '.r-1adg3ll.r-13qz1uu[style*="padding-bottom: 100%;"]',
        );

        for (const div of divsToRemovePadding) {
          div.style.paddingBottom = '';
        }

        for (const subContainer of subContainers) {
          subContainer.classList.add('chat-avatar-sub-container');
        }
      }
    }

    for (const conversationAvatarBadge of conversationAvatarBadges) {
      conversationAvatarBadge.classList.add('conversation-avatar-badges');
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
        .chat-ethos-credibility-badge-wrapper {
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

        .chat-ethos-credibility-badge-container {
            height: 16px;
            min-width: 48px;
            display: flex;
            justify-content: center;
            gap: 3px;
            align-items: center;
            border: 4px solid ${borderColor};
            border-radius: 30px;
        }

        .chat-ethos-credibility-badge-point {
            font-size: 10px;
            font-weight: 400;
            color: #F0F0EE;
            line-height: 11px;
            font-family: 'Inter', sans-serif;
            padding-top: 2px;
            max-width: 40px;
            overflow: hidden;
        }

        .chat-ethos-credibility-badge-icon {
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
    const conversationContainers = document.querySelectorAll<HTMLElement>(
      '[data-testid="conversation"]',
    );

    for (const conversationContainer of conversationContainers) {
      const avatarContainers = conversationContainer.querySelectorAll<HTMLElement>(
        '[data-testid="DM_Conversation_Avatar"]',
      );

      for (const avatarContainer of avatarContainers) {
        const userAvatarContainer = avatarContainer.querySelector<HTMLElement>(
          '[data-testid^="UserAvatar-Container-"]',
        );

        if (
          userAvatarContainer &&
          !userAvatarContainer.classList.contains('ethos-processed-label')
        ) {
          userAvatarContainer.classList.add('ethos-processed-label');

          const badgeContainer = document.createElement('div');
          badgeContainer.className = 'chat-ethos-credibility-badge-wrapper';
          badgeContainer.innerHTML = `
                    <div class="chat-ethos-credibility-badge-container" style="background-color: gray">
                        <div class="chat-ethos-credibility-badge-point"><span class="loading-bar" style="max-width: 15px;"></span></div>
                        <img src=${_images.ethosWhiteLogo} class="chat-ethos-credibility-badge-icon"/>
                    </div>
                `;
          userAvatarContainer.appendChild(badgeContainer);

          const handleId = extractHandleId(avatarContainer);

          try {
            const credibilityScore = await _credibilityHelper.fetchValue(handleId);
            const color = getColorByScore(credibilityScore);

            const credibilityBadgeContainer = badgeContainer.querySelector<HTMLElement>(
              '.chat-ethos-credibility-badge-container',
            );
            const credibilityBadgePoint = badgeContainer.querySelector<HTMLElement>(
              '.chat-ethos-credibility-badge-point',
            );

            if (credibilityBadgeContainer) {
              credibilityBadgeContainer.style.backgroundColor = color;
            }

            if (credibilityBadgePoint) {
              credibilityBadgePoint.innerHTML = credibilityScore.toString();
            }
          } catch (error) {
            console.error('Error fetching credibility score:', error);
          }
        }
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

function addGroupChatAvatarBorder(bgColor: string) {
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
        .group-chat-avatar-outer-border {
            border-radius: 50%;
            border: 3px solid gray;
        }

        .group-chat-avatar-inner-border {
            border: 3px solid ${innerBorderColour};
            border-radius: 50%;
            height:40px;
            width: 40px;
        }

        .group-chat-container {
            overflow: visible;
        }

        .group-chat-main-container {
            margin-right: 20px;
        }
    `;
  document.head.appendChild(style);

  const addBorders = () => {
    if (!isShowScoreBorders) return;
    const conversationContainers = document.querySelectorAll<HTMLElement>(
      '[data-testid="conversation"]',
    );
    const conversationAvatarBadges = document.querySelectorAll<HTMLElement>(
      '[data-testid="DMConversationAvatarBadge"]',
    );

    conversationContainers.forEach((conversationContainer) => {
      const avatarContainers = conversationContainer.querySelectorAll<HTMLElement>(
        '[data-testid="DM_Conversation_Avatar"].css-175oi2r.r-1ny4l3l.r-1loqt21',
      );

      const containsAvatarBadges = Array.from(conversationAvatarBadges).some((badge) =>
        conversationContainer.contains(badge),
      );

      if (containsAvatarBadges) {
        avatarContainers.forEach((avatarContainer) => {
          avatarContainer.classList.add('group-chat-avatar-inner-border');

          const parentDiv = avatarContainer.closest('.r-1p0dtai');

          if (parentDiv) {
            parentDiv.classList.add('group-chat-avatar-outer-border');

            const grandParentDiv = parentDiv.closest('.css-175oi2r.r-1adg3ll.r-1udh08x');

            if (grandParentDiv) {
              grandParentDiv.classList.add('group-chat-container');

              const mainContainerDiv = parentDiv.closest(
                '.css-175oi2r.r-18kxxzh.r-1wron08.r-onrtq4',
              );

              if (mainContainerDiv) {
                mainContainerDiv.classList.add('group-chat-main-container');
              }
            }
          }
        });
      }
    });
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

function addAvatarHeaderBorders(bgColor: string) {
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
        .chat-header-avatar-outer-border {
            border-radius: 50%;
            border: 3px solid gray;
        }

        .chat-header-avatar-inner-border {
            border: 3px solid ${innerBorderColour};
            border-radius: 50%;
        }
    `;
  document.head.appendChild(style);

  const addBordersToHeaderAvatar = () => {
    if (!isShowScoreBorders) return;
    const sectionContainers = document.querySelectorAll<HTMLElement>(
      '.css-175oi2r.r-1awozwy.r-18u37iz.r-1h3ijdo.r-1777fci.r-f8sm7e.r-13qz1uu.r-3pj75a.r-1ye8kvj',
    );

    sectionContainers.forEach((sectionContainer) => {
      const specificLink = sectionContainer.querySelector<HTMLElement>(
        'credibility-score-pooling-helper.ts[href="/messages/1816447681080041653/info"][aria-label="Group info"].css-175oi2r.r-sdzlij.r-1phboty.r-rs99b7.r-lrvibr.r-2yi16.r-1qi8awa.r-o7ynqc.r-6416eg.r-1ny4l3l.r-1loqt21',
      );

      if (specificLink) {
        const outerAvatarDivs = sectionContainer.querySelectorAll<HTMLElement>(
          '.css-175oi2r.r-sdzlij.r-1udh08x.r-45ll9u.r-u8s1d.r-1v2oles.r-176fswd',
        );
        const innerAvatarDivs = sectionContainer.querySelectorAll<HTMLElement>(
          '.css-175oi2r.r-172uzmj.r-1pi2tsx.r-13qz1uu.r-1ny4l3l',
        );

        outerAvatarDivs.forEach((outerDiv) => {
          outerDiv.classList.add('chat-header-avatar-outer-border');
        });

        innerAvatarDivs.forEach((innerDiv) => {
          innerDiv.classList.add('chat-header-avatar-inner-border');
        });
      }
    });
  };

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        addBordersToHeaderAvatar();
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

  addBordersToHeaderAvatar();
}

function addChatMessageAvatarBorders(bgColor: string) {
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
        .chat-message-avatar-outer-border {
            border: 3px solid gray;
            margin-bottom: 8px;
        }

        .chat-message-avatar-inner-border {
            border: 3px solid ${innerBorderColour};
        }

        .chat-message-avatar-inner-round-border,
        .chat-message-avatar-outer-round-border {
            border-radius: 50%;
        }
    `;
  document.head.appendChild(style);

  const addBordersToMessageAvatars = async () => {
    if (!isShowScoreBorders) return;
    const messageEntryContainers = document.querySelectorAll<HTMLElement>(
      '[data-testid="messageEntry"]',
    );

    for (const messageEntryContainer of messageEntryContainers) {
      const innerAvatarDivs = messageEntryContainer.querySelectorAll<HTMLElement>(
        '[data-testid="UserAvatar-Container-unknown"]',
      );

      for (const innerAvatarDiv of innerAvatarDivs) {
        const outerAvatarDiv = innerAvatarDiv.closest('.css-175oi2r.r-u8s1d.r-1d2f490')!;

        if (outerAvatarDiv) {
          const isViewportView = (outerAvatarDiv as HTMLElement)?.dataset?.viewportview;

          if (!outerAvatarDiv.classList.contains('chat-processed-border') && !isViewportView) {
            outerAvatarDiv.classList.add('chat-processed-border');

            innerAvatarDiv.classList.add('chat-message-avatar-inner-border');
            outerAvatarDiv.classList.add('chat-message-avatar-outer-border');
            // Round avatars have a child with class 'r-sdzlij' deep in the DOM
            const isRoundAvatar = outerAvatarDiv.getElementsByClassName('r-sdzlij').length > 0;

            if (isRoundAvatar) {
              innerAvatarDiv.classList.add('chat-message-avatar-inner-round-border');
              outerAvatarDiv.classList.add('chat-message-avatar-outer-round-border');
            }

            const handleId = extractHandleId(innerAvatarDiv);

            try {
              const credibilityScore = await _credibilityHelper.fetchValue(handleId);
              const borderColor = getColorByScore(credibilityScore);
              (outerAvatarDiv as HTMLElement).style.border = `3px solid ${borderColor}`;
            } catch (error) {
              console.error('Error fetching credibility score:', error);
              (outerAvatarDiv as HTMLElement).style.border = '3px solid red';
            }
          }
        }
      }
    }
  };

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        addBordersToMessageAvatars();
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

  addBordersToMessageAvatars();
}

function addChatAvatarLabels(bgColor: string) {
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
        .chat-ethos-credibility-badge-wrapper {
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

        .chat-ethos-credibility-badge-container {
            height: 16px;
            min-width: 48px;
            display: flex;
            justify-content: center;
            gap: 3px;
            align-items: center;
            border: 4px solid ${borderColor};
            border-radius: 30px;
        }

        .chat-ethos-credibility-badge-point {
            font-size: 10px;
            font-weight: 400;
            color: #F0F0EE;
            line-height: 11px;
            font-family: 'Inter', sans-serif;
            padding-top: 1px;
            max-width: 40px;
            overflow: hidden;
        }

        .chat-ethos-credibility-badge-icon {
            width: 8px;
            height: 8px;
        }

        .chat-header-avatar-outer-border {
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
  document.head.appendChild(style);

  const addLabels = async () => {
    if (!isShowScoreLabels) return;
    const messageEntries = document.querySelectorAll<HTMLElement>('[data-testid="messageEntry"]');

    for (const messageEntry of messageEntries) {
      const avatarContainer = messageEntry.querySelector<HTMLElement>(
        '[data-testid^="UserAvatar-Container-"]',
      );

      if (avatarContainer && !avatarContainer.classList.contains('ethos-processed-label')) {
        avatarContainer.classList.add('ethos-processed-label');

        const badgeContainer = document.createElement('div');
        badgeContainer.className = 'chat-ethos-credibility-badge-wrapper';
        badgeContainer.innerHTML = `
                <div class="chat-ethos-credibility-badge-container" style="background-color: gray">
                    <div class="chat-ethos-credibility-badge-point"><span class="loading-bar" style="max-width: 15px;"></span></div>
                    <img src=${_images.ethosWhiteLogo} alt="ethos-badge" class="chat-ethos-credibility-badge-icon"/>
                </div>
            `;
        avatarContainer.appendChild(badgeContainer);

        const handleId = extractHandleId(avatarContainer);

        try {
          const credibilityScore = await _credibilityHelper.fetchValue(handleId);
          badgeContainer.querySelector<HTMLElement>(
            '.chat-ethos-credibility-badge-container',
          )!.style.backgroundColor = getColorByScore(credibilityScore);
          badgeContainer.querySelector<HTMLElement>(
            '.chat-ethos-credibility-badge-point',
          )!.innerHTML = credibilityScore.toString();
        } catch (error) {
          console.error('Error fetching credibility score:', error);
        }
      }
    }
  };

  // Example usage
  addLabels();
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

function removeAvatarBorders() {
  // Select all avatar containers that might have been modified with borders
  const avatarContainers = document.querySelectorAll<HTMLElement>(
    '.chat-avatar-outer-border, .chat-avatar-square-outer-border, .group-chat-avatar-outer-border, .chat-header-avatar-outer-border, .chat-message-avatar-outer-border',
  );
  avatarContainers.forEach((container) => {
    // Remove all border-related classes
    container.classList.remove(
      'chat-avatar-outer-border',
      'chat-avatar-square-outer-border',
      'chat-avatar-inner-border',
      'chat-avatar-square-inner-border',
      'group-chat-avatar-outer-border',
      'group-chat-avatar-inner-border',
      'chat-header-avatar-outer-border',
      'chat-header-avatar-inner-border',
      'chat-message-avatar-outer-border',
      'chat-message-avatar-inner-border',
      'chat-message-avatar-inner-round-border',
      'chat-message-avatar-outer-round-border',
    );

    // Reset any inline styles that might have been set for borders
    container.style.border = '';
    container.querySelectorAll<HTMLElement>('*').forEach((child) => {
      child.style.border = '';
    });
  });
}

function removeAvatarLabels() {
  // Select all avatar containers that might have been modified with labels
  const labelContainers = document.querySelectorAll<HTMLElement>('.ethos-processed-label');
  labelContainers.forEach((container) => {
    // Remove label processing classes
    container.classList.remove('ethos-processed-label');

    // Remove any added badge containers specifically
    const badgeContainers = container.querySelectorAll('.chat-ethos-credibility-badge-wrapper');
    badgeContainers.forEach((badge) => {
      badge.remove();
    });

    // Optionally remove any dynamically inserted style tags if they are identifiable
    container.querySelectorAll('style.custom-avatar-style').forEach((style) => {
      style.remove();
    });
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
        .chat-avatar-inner-border {
            border: 3px solid ${innerBorderColour};
            border-radius: 50%;
        }

        .chat-avatar-square-inner-border {
            border: 3px solid ${innerBorderColour};
            border-radius: 6px;
        }

        .group-chat-avatar-inner-border {
            border: 3px solid ${innerBorderColour};
            border-radius: 50%;
            height:40px;
            width: 40px;
        }

        .chat-header-avatar-inner-border {
            border: 3px solid ${innerBorderColour};
        }

        .chat-message-avatar-inner-border {
            border: 3px solid ${innerBorderColour};
        }

        .chat-message-avatar-inner-round-border,
        .chat-message-avatar-outer-round-border {
            border-radius: 50%;
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
        .chat-ethos-credibility-badge-container {
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
