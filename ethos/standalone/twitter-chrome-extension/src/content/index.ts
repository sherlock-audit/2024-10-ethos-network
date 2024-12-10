import { initializeCellProfileCredibility } from "./components/avatar-credibility-formatting's/cell-profile-credibility.ts";
import { initializeChatProfileCredibility } from "./components/avatar-credibility-formatting's/chat-profile-credibility.ts";
import { initializeFeedProfileCredibility } from "./components/avatar-credibility-formatting's/feed-profile-credibility.ts";
import { initializePageProfileCredibility } from "./components/avatar-credibility-formatting's/page-profile-credibility.ts";
import { initializeHighlightTweetEthAddress } from './components/highlight-tweet-eth-address.ts';
import { initializeEthAddHoverPopups } from './components/popups/eth-address-hover-popup.ts';
import { initializeProfileContentPopup } from './components/popups/profile-hover-popup.ts';
import { initializeProfileRowContent } from './components/profile-page-content.ts';
import { HISTORY_STATE_UPDATED } from './config/constants.ts';
import { CredibilityScorePoolingHelper } from './data-fetching/credibility-score-pooling-helper.ts';
import { images } from './definitions/image-resources-definition.ts';
import { injectContentFonts } from './helpers/inject-content-fonts.ts';

// Create an instance of the CredibilityScorePoolingHelper
const credibilityHelper: CredibilityScorePoolingHelper =
  CredibilityScorePoolingHelper.getInstance();

// Enum for storage keys
enum StorageKeys {
  ShowCredibilityScoreBorders = 'isShowCredibilityScoreBorders',
  ShowCredibilityScoreLabels = 'isShowCredibilityScoreLabels',
}

// Set default values for storage keys if they don't exist
chrome.storage.local.get(
  [StorageKeys.ShowCredibilityScoreBorders, StorageKeys.ShowCredibilityScoreLabels],
  (result) => {
    const isShowScoreBorders = result[StorageKeys.ShowCredibilityScoreBorders] ?? true;
    const isShowScoreLabels = result[StorageKeys.ShowCredibilityScoreLabels] ?? true;

    chrome.storage.local.set({
      [StorageKeys.ShowCredibilityScoreBorders]: isShowScoreBorders,
      [StorageKeys.ShowCredibilityScoreLabels]: isShowScoreLabels,
    });
  },
);

// root doc enhancement
injectContentFonts();
initializeProfileRowContent();
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === HISTORY_STATE_UPDATED) {
    initializeProfileRowContent();
  }
});

initializeHighlightTweetEthAddress();

// avatar-credibility-formatting
initializeFeedProfileCredibility(images, credibilityHelper);
initializeCellProfileCredibility(images, credibilityHelper);
initializeChatProfileCredibility(images, credibilityHelper);
initializePageProfileCredibility(images, credibilityHelper);

// Popup
initializeProfileContentPopup();
initializeEthAddHoverPopups();
