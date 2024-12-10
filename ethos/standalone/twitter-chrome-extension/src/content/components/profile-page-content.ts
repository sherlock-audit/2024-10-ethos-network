import { CheckTwoToneSvg, LogoSvg, ReviewFilledSvg, VouchFilledSvg, WarningSvg } from '../../icons';
import { ETHOS_WEB_URL } from '../config/constants.ts';
import ReviewAndVouchFetchHelper from '../data-fetching/review-and-vouch.ts';
import {
  getWriteReviewLink,
  isValuePlaceholder,
  setBackgroundColorName,
  spinner,
} from '../helpers/components-helper.ts';
import { formatReviews, formatVouchers, formatPercentage } from '../helpers/text.ts';

let intervalId: NodeJS.Timeout;

export function initializeProfileRowContent() {
  setBackgroundColorName().then((bgColor) => {
    updateColorTheme(bgColor);
  });
  addProfileRowContent();
}

function updateColorTheme(bgColor: string) {
  let rowBgColor = '';
  let viewProfileBtnBg = '';
  let boldTextColor = '';
  let regularTextColor = '';

  if (bgColor === 'dark') {
    rowBgColor = '#EFEEE01F';
    viewProfileBtnBg = '#EFEEE01F';
    boldTextColor = '#C1C0B6D9';
    regularTextColor = '#C1C0B6D9';
  } else if (bgColor === 'dim') {
    rowBgColor = '#EFEEE012';
    viewProfileBtnBg = '#EFEEE014';
    boldTextColor = '#C1C0B6D9';
    regularTextColor = '#C1C0B6D9';
  } else if (bgColor === 'light') {
    rowBgColor = '#F2F2F2';
    viewProfileBtnBg = '#E5E5E6';
    boldTextColor = '#1F2126E0';
    regularTextColor = '#1F2126E0';
  }

  injectStyles(bgColor, rowBgColor, viewProfileBtnBg, boldTextColor, regularTextColor);
}

function addProfileRowContent() {
  clearInterval(intervalId);
  const targetClass = 'css-175oi2r r-3pj75a r-ttdzmv r-1ifxtd0';
  const checkInterval = 500;
  const handleId = extractTwitterHandleFromURL();

  function contentHTML(
    positivePercentage: string,
    reviewCount: string,
    vouchedInUSD: string,
    voucherCount: string,
  ) {
    return `
      <div class="ethos-profile-info-container">
        <div class="ethos-profile-row-container">
            <div class="profile-row-item">
                ${ReviewFilledSvg({
                  className: 'profile-row-item-icon',
                })}
                <div class="ethos-review-text-bold">${isValuePlaceholder(positivePercentage) ? spinner : formatPercentage(positivePercentage)}</div>
                <div class="ethos-review-text-regular">${isValuePlaceholder(reviewCount) ? spinner : `(${formatReviews(reviewCount)})`}</div>
            </div>
            <div class="profile-row-item">
                ${VouchFilledSvg({
                  className: 'profile-row-item-icon',
                })}
                <div class="ethos-review-text-bold">${isValuePlaceholder(vouchedInUSD) ? spinner : vouchedInUSD}</div>
                <div class="ethos-review-text-regular">${isValuePlaceholder(voucherCount) ? spinner : `(${formatVouchers(voucherCount)})`}</div>
            </div>
              <a href="${ETHOS_WEB_URL}/profile/x/${handleId}" class="view-profile-btn" target="_blank">
                <span>View Profile</span>
                ${
                  parseInt(voucherCount || reviewCount, 10) > 0
                    ? CheckTwoToneSvg({
                        className: 'profile-status',
                      })
                    : WarningSvg({
                        className: 'profile-status',
                      })
                }
              </a>
            ${LogoSvg({
              className: 'ethos-white-logo',
            })}
        </div>
        ${getWriteReviewLink({ handleId }).outerHTML}
      </div>
    `;
  }

  intervalId = setInterval(async () => {
    const targetElement = document.querySelector(`.${targetClass.split(' ').join('.')}`);

    if (targetElement) {
      clearInterval(intervalId);
      // Get the existing content
      const existingContent = targetElement.nextElementSibling as HTMLElement | null;

      if (!existingContent || existingContent?.dataset?.handleId !== handleId) {
        // Only insert placeholder content if no existing content is found
        if (!existingContent) {
          targetElement.insertAdjacentHTML('afterend', contentHTML('_', '_', '_', '_'));
        }

        try {
          // Fetch and update values asynchronously
          const [positivePercentage, reviewCount, vouchedInUSD, voucherCount] =
            await ReviewAndVouchFetchHelper.fetchReviewAndVouchDataByXHandle(handleId);
          // Remove old content if any before adding updated content
          const existingContent = document.querySelectorAll('.ethos-profile-info-container');
          existingContent.forEach((el) => {
            el.remove();
          });

          // Update the content with fetched data if removal is successful
          targetElement.insertAdjacentHTML(
            'afterend',
            contentHTML(positivePercentage, reviewCount, vouchedInUSD, voucherCount),
          );

          // Set the handleId as a data attribute for future reference
          if (targetElement.nextElementSibling instanceof HTMLElement) {
            targetElement.nextElementSibling.dataset.handleId = handleId;
          }
        } catch (error) {
          console.error('❗ Error fetching and updating values:', error);
        }
      }
    } else {
      setBackgroundColorName().then((bgColor) => {
        updateColorTheme(bgColor);
      });
    }
  }, checkInterval);
}

function injectStyles(
  bgColor: string,
  rowBgColor: string,
  viewProfileBtnBg: string,
  boldTextColor: string,
  regularTextColor: string,
) {
  // Remove all previously added style elements with the specific ID
  const existingStyles = document.querySelectorAll('style[id^="profile-theme-styles"]');
  existingStyles.forEach((style) => {
    style.remove();
  });

  // Create credibility-score-pooling-helper.ts new style element
  const style = document.createElement('style');
  style.id = `profile-theme-styles-${Date.now()}`; // Give credibility-score-pooling-helper.ts unique ID to the style element
  style.innerHTML = `
        .ethos-profile-point-badge-container {
            height: 20px;
            min-width: 70px;
            display: flex;
            justify-content: center;
            gap: 3px;
            align-items: center;
            border: 4px solid ${bgColor === 'dark' ? 'black' : bgColor === 'dim' ? '#16202B' : 'white'};
            border-radius: 30px;
        }
        .ethos-profile-info-container {
            font-family: 'Inter', sans-serif;
        }
        .ethos-profile-info-container > .write-review-link {
           padding-block: 9px;
        }
        .ethos-profile-row-container {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: ${rowBgColor};
            padding: 18px;
            gap: 10px;
        }

        .profile-row-item {
            display: flex;
            align-items: center;
            border-radius: 5px;
            padding: 10px;
            gap: 3px;
        }

        .ethos-review-text-bold {
            font-family: 'Inter', sans-serif;
            font-weight: 700;
            font-size: 12px;
            line-height: 12px;
            color: ${boldTextColor};
            padding-top: 2px;
        }

        .ethos-review-text-regular {
            font-family: 'Inter', sans-serif;
            font-size: 12px;
            line-height: 12px;
            color: ${regularTextColor};
        }

        .profile-row-item-icon {
            width: 14px;
            height: 14px;
            margin-right: 5px;
        }

        .view-profile-btn {
            padding: 10px;
            border-radius: 5px;
            background: ${viewProfileBtnBg};
            font-size: 12px;
            font-weight: 700;
            border: none;
            color: ${boldTextColor};
            font-family: 'Inter', sans-serif;
            text-decoration: none;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
        }

        .ethos-white-logo {
            width: 21px;
            height: 21px;
        }

        .loading-bar {
            display: inline-block;
            width: 50px;
            height: 12px;
            background-color: rgba(255, 255, 255, 0.3);
            position: relative;
            overflow: hidden;
            opacity: 25%;
        }

        .loading-bar::before {
            content: '';
            display: block;
            position: absolute;
            left: -100%;
            width: 100%;
            height: 100%;
            background-color: #fff;
            animation: loading-bar 1.5s infinite;
        }

        @keyframes loading-bar {
            0% { left: -100%; }
            50% { left: 100%; }
            100% { left: 100%; }
        }

        .profile-status {
            width: 15px;
            height: 15px;
        }
    `;
  // Append the new style element to the document head
  document.head.appendChild(style);
}

function extractTwitterHandleFromURL(): string {
  const urlParts = window.location.pathname.split('/');

  return urlParts[urlParts.length - 1];
}
