import {
  CheckTwoToneSvg,
  LogoSvg,
  ReviewFilledSvg,
  VouchFilledSvg,
  WarningSvg,
} from '../../../icons';
import { ETHOS_WEB_URL } from '../../config/constants.ts';
import ReviewAndVouchFetchHelper from '../../data-fetching/review-and-vouch.ts';
import {
  getColorByScore,
  getDescriptionByScore,
  getWriteReviewLink,
  isValuePlaceholder,
  setBackgroundColorName,
  spinner,
} from '../../helpers/components-helper.ts';
import { formatReviews, formatVouchers, formatPercentage } from '../../helpers/text.ts';
import { dataFetchingService } from '../../service/data-fetching-service.ts';

const POPUP_DELAY = 500;
const POPUP_REMOVE_DELAY = 500;

type PopupContent = {
  ethAddress: string;
  credibilityScore: string;
  positivePercentage: string;
  reviewCount: string;
  vouchedInUSD: string;
  voucherCount: string;
  description: string;
  color: string;
};

class PopupManager {
  private activePopup: HTMLElement | null = null;
  private popupTimeout: number | null = null;
  private removePopupTimeout: number | null = null;
  private isPopupVisible: boolean = false;
  private bgColor: string = 'light';

  private popBgColor: string = '';
  private fontColor: string = '';
  private secondaryFontColor: string = '';
  private ethosColor: string = '';
  private popupShadow: string = '';
  private borderColor: string = '';

  constructor() {
    this.initialize();
  }

  private initialize() {
    setBackgroundColorName().then(() => {
      this.updateColorThemeOnDocChange();

      document.body.addEventListener('mouseover', this.handleMouseOver.bind(this), {
        passive: true,
      });
      window.addEventListener('resize', this.updatePopupPosition.bind(this));
    });
  }

  private async resolveEnsToEthAddressWithFallback(ensName: string): Promise<string | null> {
    const maxRetries = 2;
    let ethAddress: string | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        ethAddress = await this.convertEnsToEthAddress(ensName);

        // Validate if the ethAddress is correctly formatted (e.g., 42 characters, starting with "0x")
        if (this.isValidEthAddress(ethAddress)) {
          return ethAddress;
        } else {
          console.warn(
            `Attempt ${attempt}: Invalid Ethereum address returned for ENS name: ${ensName}`,
          );
        }
      } catch (error) {
        console.error(`Attempt ${attempt}: Error resolving ENS name to Ethereum address`, error);
      }
    }

    console.error(`Failed to resolve ENS name after ${maxRetries} attempts: ${ensName}`);

    return null; // Return null if all attempts fail
  }

  private isValidEthAddress(ethAddress: string | null): boolean {
    // Simple validation: Ethereum addresses are 42 characters long and start with "0x"
    return Boolean(ethAddress) && /^0x[a-fA-F0-9]{40}$/.test(ethAddress ?? '');
  }

  private async handleMouseOver(event: MouseEvent) {
    const target = event.target as HTMLElement;

    if (this.isPopupVisible || !this.isTargetValid(target)) {
      return;
    }

    this.clearPopups();

    let ethAddress = (target.dataset.ensName ?? target.textContent ?? '').trim();

    if (target.matches('.highlighted-ens-name')) {
      const ensName = ethAddress; // Store the original ENS name
      ethAddress = (await this.resolveEnsToEthAddressWithFallback(ensName)) ?? '';

      if (!ethAddress) {
        console.error(`Failed to resolve ENS name: ${ensName}`);

        return; // Exit if the ENS name couldn't be resolved
      }
    }

    this.popupTimeout = window.setTimeout(() => {
      this.activePopup = this.createPopup(target, ethAddress);
      document.body.appendChild(this.activePopup);
      this.setupPopupRemoval(target, this.activePopup);
      this.isPopupVisible = true;
    }, POPUP_DELAY);
  }

  private async convertEnsToEthAddress(ensName: string): Promise<string | null> {
    try {
      return await dataFetchingService.convertEnsToEthAddress(ensName);
    } catch (error) {
      console.error('Failed to convert ENS name to Ethereum address:', error);

      return null;
    }
  }

  private isTargetValid(target: HTMLElement): boolean {
    return target.matches('.highlighted-address') || target.matches('.highlighted-ens-name');
  }

  private clearPopups() {
    if (this.activePopup) {
      if (document.body.contains(this.activePopup)) {
        document.body.removeChild(this.activePopup);
      }
      this.activePopup = null;
      this.isPopupVisible = false;
    }

    if (this.popupTimeout) clearTimeout(this.popupTimeout);
    if (this.removePopupTimeout) clearTimeout(this.removePopupTimeout);

    const existingStyles = document.head.querySelectorAll('style[generated="true"]');
    existingStyles.forEach((style) => {
      style.remove();
    });
  }

  private createPopup(target: HTMLElement, ethAddress: string): HTMLElement {
    const popup = document.createElement('div');
    this.updateColorThemeOnDocChange();
    this.stylePopup(popup);
    this.positionPopup(popup, target);
    this.populateInitialContent(popup, ethAddress);
    this.fetchAndUpdateValues(popup, ethAddress);

    return popup;
  }

  private async fetchAndUpdateValues(popup: HTMLElement, ethAddress: string) {
    try {
      const [credibilityScoreResponse, reviewAndVouchData] = await Promise.all([
        dataFetchingService.fetchCredibilityScoreFromEthAddress(ethAddress),
        ReviewAndVouchFetchHelper.fetchReviewAndVouchDataByEthAddress(ethAddress),
      ]);

      const credibilityScore = credibilityScoreResponse?.score?.toString() ?? '0';
      const score = parseInt(credibilityScore) || 0;
      const description = getDescriptionByScore(score) || '_';
      const color = getColorByScore(score);

      this.updatePopupContent(popup, {
        ethAddress,
        credibilityScore,
        positivePercentage: reviewAndVouchData[0] || '_',
        reviewCount: reviewAndVouchData[1] || '_',
        vouchedInUSD: reviewAndVouchData[2]?.toString() || '_',
        voucherCount: reviewAndVouchData[3]?.toString() || '_',
        description,
        color,
      });
    } catch (error) {
      console.error('Failed to fetch values:', error);
    }
  }

  private setupPopupRemoval(target: HTMLElement, popup: HTMLElement) {
    const schedulePopupRemoval = () => {
      this.removePopupTimeout = window.setTimeout(() => {
        if (popup && document.body.contains(popup)) {
          document.body.removeChild(popup);
          this.isPopupVisible = false;
        }
      }, POPUP_REMOVE_DELAY);
    };

    const clearRemovalTimeout = () => {
      if (this.removePopupTimeout) clearTimeout(this.removePopupTimeout);
    };

    popup.addEventListener('mouseleave', schedulePopupRemoval);
    target.addEventListener('mouseleave', schedulePopupRemoval);

    popup.addEventListener('mouseenter', clearRemovalTimeout);
    target.addEventListener('mouseenter', clearRemovalTimeout);
  }

  private stylePopup(popup: HTMLElement) {
    this.injectStyles(this.bgColor);
    popup.className = 'eth-popover-container';
  }

  private positionPopup(popup: HTMLElement, target: HTMLElement) {
    const rect = target.getBoundingClientRect();
    popup.style.position = 'absolute';
    popup.style.top = `${rect.bottom + window.scrollY + 10}px`;
    popup.style.left = `${rect.left + window.scrollX}px`;
  }

  private updatePopupPosition() {
    if (this.activePopup) {
      const target = document.querySelector<HTMLElement>(
        '.highlighted-address, .highlighted-ens-name',
      )!;

      if (target) {
        this.positionPopup(this.activePopup, target);
      }
    }
  }

  private populateInitialContent(popup: HTMLElement, ethAddress: string) {
    while (popup.firstChild) {
      popup.removeChild(popup.firstChild);
    }
    const loadingContent = spinner;
    this.updatePopupContent(popup, {
      ethAddress,
      credibilityScore: '_',
      positivePercentage: '_',
      reviewCount: '_',
      vouchedInUSD: '_',
      voucherCount: '_',
      description: loadingContent,
      color: '_',
    });
  }

  private updatePopupContent(popup: HTMLElement, content: PopupContent) {
    popup.innerHTML = `
      <div class="ethos-popover-content">
          <div class="eth-popover-review-items-container">
              ${this.getReviewItemHTML(
                'review',
                isValuePlaceholder(content.positivePercentage)
                  ? spinner
                  : `${formatPercentage(content.positivePercentage)} positive`,
                isValuePlaceholder(content.reviewCount)
                  ? spinner
                  : formatReviews(content.reviewCount),
              )}
              ${this.getReviewItemHTML(
                'vouch',
                isValuePlaceholder(content.vouchedInUSD)
                  ? spinner
                  : `${content.vouchedInUSD} vouched`,
                isValuePlaceholder(content.vouchedInUSD)
                  ? spinner
                  : formatVouchers(content.voucherCount),
              )}
          </div>
          <div class="reputable-container">
              <div class="reputable-text" style="color: ${content.color};">
                  ${isValuePlaceholder(content.description) ? spinner : content.description}
              </div>
              ${this.getCredibilityHTML(isValuePlaceholder(content.credibilityScore) ? spinner : content.credibilityScore)}
              <div class="view-profile-row"><a href="${ETHOS_WEB_URL}/profile/${content.ethAddress}" class="link-btn" target="_blank">View full profile</a>
                ${
                  parseInt(content.vouchedInUSD || content.reviewCount) > 0
                    ? CheckTwoToneSvg({
                        className: 'profile-status-icon',
                      })
                    : WarningSvg({
                        className: 'profile-status-icon',
                      })
                }
              </div>
          </div>
      </div>
    `;

    const writeReview = getWriteReviewLink({ ethAddress: content.ethAddress });
    popup.appendChild(writeReview);
  }

  private getReviewItemHTML(iconType: 'review' | 'vouch', boldText: string, regularText: string) {
    return `
            <div class="eth-popover-review-item">
                ${
                  iconType === 'review'
                    ? ReviewFilledSvg({
                        className: 'eth-review-icon',
                      })
                    : VouchFilledSvg({
                        className: 'eth-review-icon',
                      })
                }
                <div>
                    <div class="eth-popover-review-text-bold">${boldText}</div>
                    <div class="eth-popover-review-text-regular">${regularText}</div>
                </div>
            </div>
        `;
  }

  private getCredibilityHTML(score: string) {
    const color = getColorByScore(parseInt(score));

    return `
            <div class="credibility-container">
                <div class="credibility-score" style="color: ${color}">${score}</div>
                ${LogoSvg({
                  color,
                  className: 'ethos-icon',
                })}
            </div>
        `;
  }

  private updateColorThemeOnDocChange(): void {
    const resolveBackgroundColorName = (backgroundColor: string): string => {
      const colorMap: Record<string, string> = {
        'rgb(0, 0, 0)': 'dark',
        'rgb(255, 255, 255)': 'light',
        'rgb(21, 32, 43)': 'dim',
      };

      return colorMap[backgroundColor] || 'unknown';
    };

    const updateTheme = () => {
      const backgroundColor = getComputedStyle(document.body).backgroundColor;
      const colorName = resolveBackgroundColorName(backgroundColor);
      console.log('Background Color Changed To:', colorName);
      this.bgColor = colorName;
      this.injectStyles(colorName);
    };

    updateTheme(); // Call initially if needed

    // Listen for background color changes, if applicable (e.g., in SPAs)
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
  }

  private injectStyles(popupBgColor: string) {
    if (popupBgColor === 'dark') {
      this.popBgColor = 'black';
      this.fontColor = '#C1C0B6';
      this.secondaryFontColor = '#C1C0B6A6';
      this.ethosColor = '#1B69B1';
      this.popupShadow =
        'rgba(136, 153, 166, 0.2) 0px 0px 15px, rgba(136, 153, 166, 0.15) 0px 0px 3px 1px;';
      this.borderColor = '#282828';
    } else if (popupBgColor === 'dim') {
      this.popBgColor = '#0A121A';
      this.fontColor = '#C1C0B6';
      this.secondaryFontColor = '#C1C0B6A6';
      this.ethosColor = '#1B69B1';
      this.popupShadow =
        'rgba(136, 153, 166, 0.2) 0px 0px 15px, rgba(136, 153, 166, 0.15) 0px 0px 3px 1px;';
      this.borderColor = '#282828';
    } else if (popupBgColor === 'light') {
      this.popBgColor = '#EAEAEA';
      this.fontColor = '#1F2126';
      this.secondaryFontColor = '#1F2126A6';
      this.ethosColor = '#1F21B6';
      this.popupShadow =
        'rgba(101, 119, 134, 0.2) 0px 0px 15px, rgba(101, 119, 134, 0.15) 0px 0px 3px 1px;';
      this.borderColor = '#E9EBED';
    }

    // Removing existing generated styles before appending new ones
    const existingStyles = document.head.querySelectorAll('style[generated="true"]');
    existingStyles.forEach((style) => {
      style.remove();
    });

    // Append new styles
    const style = document.createElement('style');
    style.setAttribute('generated', 'true'); // Mark style for potential cleanup
    style.innerHTML = `
            .eth-popover-container {
                font-family: 'Inter', sans-serif;
                display: flex; flex-direction: column; width: 100%; overflow: hidden; max-width: 300px;
                background: ${this.popBgColor}; border-radius: 15px; position: relative; margin-top: 3px;
                box-shadow: ${this.popupShadow};
                border: 1px solid ${this.borderColor};
            }
            .eth-popover-review-items-container {
                display: flex; flex-direction: column; gap: 8px;
            }
            .eth-popover-review-item {
                display: flex; gap: 7px; text-align: start;
            }
            .eth-review-icon {
                width: 10px; height: 10px; margin-top: 2px;
            }
            .eth-popover-review-text-bold, .eth-popover-review-text-regular, .reputable-text {
                font-family: 'Inter', sans-serif; color: ${this.fontColor};
            }
            .eth-popover-review-text-bold {
                font-weight: 700; margin-bottom: 2px; font-size: 10px;
            }
            .eth-popover-review-text-regular {
                font-weight: 400; font-size: 10px; color: ${this.secondaryFontColor};
            }
            .reputable-text {
                font-family: 'Queens', serif; color: ${this.ethosColor}; font-size: 14px; line-height: 22px;
            }
            .credibility-container {
                display: flex; justify-content: flex-end; gap: 8px; align-items: center;
            }
            .credibility-score {
                font-size: 35px; font-family: 'Queens', serif; color: ${this.ethosColor}; line-height: 35px;
                margin-top: 5px;
            }
            .ethos-icon {
                width: 25px;
                height: 25px;
                object-fit: contain;
            }
            .view-profile-row {
                display: flex;
                align-items: center;
                gap: 5px;
                justify-content: flex-end;
            }
            .link-btn {
                text-decoration: none; font-size: 10px; color: ${this.fontColor}; font-weight: 400;
            }
            .profile-status-icon {
                width: 11px;
                height: 11px;
                margin-top: 2px;
            }
            .loading-bar {
                display: inline-block;
                width: 100%;
                height: 10px;
                background-color: ${this.secondaryFontColor};
                border-radius: 5px;
            }
        `;
    document.head.appendChild(style);
  }
}

// Initialize the PopupManager with the required services
export function initializeEthAddHoverPopups() {
  // eslint-disable-next-line no-new
  new PopupManager();
}
