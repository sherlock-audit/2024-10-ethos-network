import {
  CheckTwoToneSvg,
  LogoSvg,
  ReviewFilledSvg,
  VouchFilledSvg,
  WarningSvg,
} from '../../../icons';
import { ETHOS_WEB_URL } from '../../config/constants.ts';
import { USER_AVATAR_CONTAINER_REGEX } from '../../config/regex.ts';
import ReviewAndVouchFetchHelper from '../../data-fetching/review-and-vouch.ts';
import {
  getColorByScore,
  getDescriptionByScore,
  getWriteReviewLink,
  isValuePlaceholder,
  setBackgroundColorName,
  spinner,
  spinnerFull,
} from '../../helpers/components-helper.ts';
import { formatReviews, formatVouchers, formatPercentage } from '../../helpers/text.ts';
import { dataFetchingService } from '../../service/data-fetching-service.ts';

let popBgColor: string;
let fontColor: string;
let secondaryFontColor: string;
let ethosColor: string;
let loadingColor: string;
let loadingColorBG: string;

export function initializeProfileContentPopup() {
  setBackgroundColorName().then((bgColor) => {
    injectStyles(bgColor);
  });
  observeDocumentForHoverCards();
  // updateColorThemeOnDocChange();
}

function observeDocumentForHoverCards() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        addHighlightToHoverCard();
      }
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  addHighlightToHoverCard();
}

function addHighlightToHoverCard() {
  const hoverCard = document.querySelector<HTMLElement>('[data-testid="HoverCard"]');

  if (!hoverCard) return;

  const dynamicObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        checkAndAddContent(hoverCard);
      }
    });
  });
  dynamicObserver.observe(hoverCard, { childList: true, subtree: true });
  checkAndAddContent(hoverCard);
}

function checkAndAddContent(hoverCard: HTMLElement) {
  const dynamicElement = hoverCard.querySelector('.css-175oi2r.r-nsbfu8');
  const username = GetHandleId();

  if (dynamicElement) {
    addPopoverToHoverCard(hoverCard, username);
  }
}

function addPopoverToHoverCard(hoverCard: HTMLElement, username: string) {
  if (hoverCard.querySelector('.ethos-popover-container')) return;

  const popoverContainer = document.createElement('div');
  popoverContainer.classList.add('ethos-popover-container');
  populatePopoverContent(popoverContainer, username, '_', '_', '_', '_', '_');

  const targetDiv = hoverCard.querySelector('.css-175oi2r.r-1r5jyh0.r-1ipicw7');

  if (targetDiv) {
    targetDiv.appendChild(popoverContainer);
  }

  // Fetch and update values asynchronously
  fetchAndUpdateValues(popoverContainer, username);
}

function GetHandleId(): string {
  const avatarContainers = document.querySelectorAll<HTMLElement>('[data-testid="HoverCard"]');
  let handleId = '';

  avatarContainers.forEach((avatarContainer) => {
    // Find the element with the dynamic ID
    const handleElement = avatarContainer.querySelector<HTMLElement>(
      '[class="css-175oi2r r-1adg3ll r-bztko3"]',
    );

    if (handleElement) {
      // Get the data-testid attribute
      const dataTestId = handleElement.getAttribute('data-testid');

      // Use a regular expression to extract the dynamic part
      const match = dataTestId?.match(USER_AVATAR_CONTAINER_REGEX);

      if (match?.[1]) {
        handleId = match[1];

        // Exit the loop once the handleId is found
        return handleId;
      }
    }
  });

  return handleId;
}

async function fetchAndUpdateValues(popoverContainer: HTMLElement, username: string) {
  try {
    // Define the fetch method and identifier

    // Fetch data concurrently
    const [credibilityScoreResponse, reviewAndVouchData] = await Promise.all([
      dataFetchingService.fetchCredibilityScoreFromXHandler(username),
      ReviewAndVouchFetchHelper.fetchReviewAndVouchDataByXHandle(username),
    ]);

    // Extract the credibility score string from the response
    const credibilityScore = credibilityScoreResponse.score?.toString() ?? '_';

    // Get handle ID if needed
    const handleId = GetHandleId();

    // Update the popover content with the fetched data
    updatePopoverContent(popoverContainer, credibilityScore, ...reviewAndVouchData, handleId);
  } catch (error) {
    console.error('❗ Failed to fetch values:', error);
  }
}

function getReviewItemHTML(
  iconType: 'review' | 'vouch',
  boldText: string,
  regularText: string,
  color?: string,
): string {
  return `
        <div class="ethos-review-item">
            ${
              iconType === 'review'
                ? ReviewFilledSvg({
                    className: 'ethos-review-star',
                    color,
                  })
                : VouchFilledSvg({
                    className: 'ethos-review-star',
                    color,
                  })
            }
            <div>
                <div class="ethos-review-text-bold">${boldText}</div>
                <div class="ethos-review-text-regular">${regularText}</div>
            </div>
        </div>
    `;
}

function getCredibilityHTML(score: string, isLoading: boolean): string {
  const color = getColorByScore(parseInt(score));
  const style = isLoading ? 'justify-content: space-between;' : '';

  return `
        <div class="credibility-container" style="${style}">
            <div class="credibility-score" style="color: ${color}">${isLoading ? spinner : score}</div>
            ${LogoSvg({
              color,
              className: 'ethos-icon',
            })}
        </div>
    `;
}

function populatePopoverContent(
  popoverContainer: HTMLElement,
  username: string,
  credibilityScore: string,
  positivePercentage: string,
  reviewCount: string,
  vouchedInUSD: string,
  voucherCount: string,
) {
  while (popoverContainer.firstChild) {
    popoverContainer.removeChild(popoverContainer.firstChild);
  }

  updateColorThemeOnDocChange();

  popoverContainer.innerHTML = `
      <div class="ethos-popover-content">
        <div class="ethos-review-items-container">
            ${getReviewItemHTML(
              'review',
              isValuePlaceholder(positivePercentage)
                ? spinner
                : `${formatPercentage(positivePercentage)} positive`,
              isValuePlaceholder(reviewCount) ? spinner : formatReviews(reviewCount),
            )}
            ${getReviewItemHTML(
              'vouch',
              isValuePlaceholder(vouchedInUSD) ? spinner : `${vouchedInUSD} vouched`,
              isValuePlaceholder(voucherCount) ? spinner : formatVouchers(voucherCount),
            )}
        </div>
        <div class="reputable-container">
            <div class="reputable-text">${spinnerFull}</div>
            ${getCredibilityHTML(credibilityScore, isValuePlaceholder(credibilityScore))}
            <div class="view-profile-row"><a href="${ETHOS_WEB_URL}/profile/x/${username}" class="link-btn">View full profile</a></div>
        </div>
      </div>
    `;

  const writeReview = getWriteReviewLink({ handleId: username });
  popoverContainer.appendChild(writeReview);
}

function updatePopoverContent(
  popoverContainer: HTMLElement,
  credibilityScore: string,
  positivePercentage: string,
  reviewCount: string,
  vouchedInUSD: string,
  voucherCount: string,
  handleId: string,
) {
  updateColorThemeOnDocChange();

  while (popoverContainer.firstChild) {
    popoverContainer.removeChild(popoverContainer.firstChild);
  }

  // Convert credibilityScore to number
  const score = parseInt(credibilityScore) || 0;
  const description = getDescriptionByScore(score);
  const colorByScore = getColorByScore(score);

  const reviewItemsContainer = document.createElement('div');
  reviewItemsContainer.className = 'ethos-review-items-container';
  reviewItemsContainer.innerHTML = `
        ${getReviewItemHTML('review', `${formatPercentage(positivePercentage)} positive`, formatReviews(reviewCount), colorByScore)}
        ${getReviewItemHTML('vouch', `${vouchedInUSD} vouched`, formatVouchers(voucherCount), colorByScore)}
    `;

  const reputableContainer = document.createElement('div');
  reputableContainer.className = 'reputable-container';
  reputableContainer.innerHTML = `
        <div class="reputable-text" style="color: ${colorByScore};">${description}</div>
        ${getCredibilityHTML(credibilityScore, isValuePlaceholder(credibilityScore))}
         <div class="view-profile-row"><a href="${ETHOS_WEB_URL}/profile/x/${handleId}" class="link-btn" target="_blank">View full profile</a>
         ${parseInt(voucherCount || reviewCount) > 0 ? CheckTwoToneSvg({ className: 'profile-status-icon' }) : WarningSvg({ className: 'profile-status-icon' })}
         </div>
    `;

  const writeReview = getWriteReviewLink({ handleId });
  const popoverContent = document.createElement('div');
  popoverContent.className = 'ethos-popover-content';
  popoverContent.appendChild(reviewItemsContainer);
  popoverContent.appendChild(reputableContainer);

  popoverContainer.appendChild(popoverContent);
  popoverContainer.appendChild(writeReview);
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

  // Check and apply the background color theme
  const updateTheme = () => {
    const backgroundColor = getComputedStyle(document.body).backgroundColor;
    const colorName = resolveBackgroundColorName(backgroundColor);
    injectStyles(colorName);
  };

  // Call the updateTheme function at desired points
  updateTheme(); // Call initially if needed
}

function injectStyles(bgColor: string) {
  // Remove all previously added style elements with the specific ID
  const existingStyles = document.querySelectorAll('style[id^="dynamic-theme-styles"]');
  existingStyles.forEach((style) => {
    style.remove();
  });

  // Determine the colors and icons based on the background color
  if (bgColor === 'dark') {
    popBgColor = 'black';
    fontColor = '#C1C0B6';
    secondaryFontColor = '#C1C0B6A6';
    ethosColor = '#1B69B1';
    loadingColor = 'rgba(255, 255, 255, 0.3)';
    loadingColorBG = 'rgba(255, 255, 255)';
  } else if (bgColor === 'dim') {
    popBgColor = '#0A121A';
    fontColor = '#C1C0B6';
    secondaryFontColor = '#C1C0B6A6';
    ethosColor = '#1B69B1';
    loadingColor = 'rgba(255, 255, 255, 0.3)';
    loadingColorBG = 'rgba(255, 255, 255)';
  } else if (bgColor === 'light') {
    popBgColor = '#EAEAEA';
    fontColor = '#1F2126';
    secondaryFontColor = '#1F2126A6';
    ethosColor = '#1f21b6';
    loadingColor = 'rgba(0,0,0,0.8)';
    loadingColorBG = 'rgb(0,0,0)';
  }

  // Create a new style element
  const style = document.createElement('style');
  style.id = `dynamic-theme-styles-${Date.now()}`; // Give a unique ID to the style element
  style.innerHTML = `
        .ethos-popover-container {
            font-family: 'Inter', sans-serif;
            display: flex; flex-direction: column; width: 100%;
            background: ${popBgColor}; border-top: 1px solid #C1C0B63F;
        }
        .ethos-review-items-container {
            display: flex; flex-direction: column; gap: 8px;
        }
        .ethos-review-item {
            display: flex; gap: 7px; text-align: start;
        }
        .ethos-review-star {
            width: 10px;
            height: 10px;
            margin-top: 4px;
        }
        .ethos-review-text-bold, .ethos-review-text-regular, .reputable-text, .link-btn {
            font-family: 'Inter', sans-serif; color: ${fontColor};
        }
        .ethos-review-text-bold {
            font-weight: 700;margin-bottom: 2px; font-size: 10px;
        }
        .ethos-review-text-regular {
            font-weight: 400; font-size: 10px; color: ${secondaryFontColor};
        }
        .ethos-popover-content {
            display: flex;
            justify-content: space-between;
            padding: 15px;
            max-width: 270px;
            width: 100%;
        }
        .write-review-link {
            display: flex; align-items: center; justify-content: center; gap: 8px;
            background-color: ${ethosColor}; color: white; font-size: 14px; text-decoration: none;
            padding: 8px;
        }
        .reputable-container {
            text-align: end;
        }
        .reputable-text {
            font-family: 'Queens', serif; color: ${ethosColor}; font-size: 14px; line-height: 14px;
        }
        .credibility-container {
            display: flex; justify-content: flex-end; gap: 8px;
        }
        .credibility-score {
            font-size: 35px; font-family: 'Queens', serif; color: ${ethosColor}; line-height: 35px;
            margin-top: 5px; margin-bottom: 5px;
        }
        .ethos-icon {
            width: 25px;
            height: 25px;
            object-fit: contain;
        }
        .view-profile-row {
            display: flex; align-items: center; gap: 5px;
        }
        .link-btn {
            text-decoration: none; font-size: 12px;
        }
        .profile-status-icon {
            width: 11px;
            height: 11px;
            margin-top: 2px;
        }
        .loading-bar {
            display: inline-block;
            width: 50px;
            height: 8px;
            background-color: ${loadingColor};
            position: relative;
            overflow: hidden;
        }
        .loading-bar::before {
            content: '';
            display: block;
            position: absolute;
            left: -100%;
            width: 100%;
            height: 100%;
            background-color: ${loadingColorBG};
            animation: loading-bar 1.5s infinite;
        }
        @keyframes loading-bar {
            0% { left: -100%; }
            50% { left: 100%; }
            100% { left: 100%; }
        }
    `;
  // Append the new style element to the document head
  document.head.appendChild(style);
}
