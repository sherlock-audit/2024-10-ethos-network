import { type Message } from '../types/message.ts';
import { HISTORY_STATE_UPDATED } from './config/constants';
import CredibilityScoreHandler from './handlers/credibility-score-handler.ts';
import ENSAddressHandler from './handlers/ens-to-address-handler.ts';
import ReviewDataHandler from './handlers/review-data-handler.ts';
import VouchDataHandler from './handlers/vouch-data-handler.ts';

async function handleMessage(message: Message, sendResponse: (response?: any) => void) {
  console.log('background handleMessage message', message);

  switch (message.type) {
    case 'FETCH_CREDIBILITY_SCORE_FROM_ADDRESS':
      await CredibilityScoreHandler.fetchCredibilityScoreFromAddress(
        { address: message.address },
        sendResponse,
      );
      break;

    case 'FETCH_CREDIBILITY_SCORE_FROM_HANDLE':
      await CredibilityScoreHandler.fetchCredibilityScoreFromXHandle(
        { handle: message.handle },
        sendResponse,
      );
      break;

    case 'FETCH_REVIEW_DETAILS_FROM_ADDRESS':
      await ReviewDataHandler.handleReviewDetailsFromEthAddress(
        { address: message.address },
        sendResponse,
      );
      break;

    case 'FETCH_REVIEW_DETAILS_FROM_HANDLE':
      await ReviewDataHandler.handleReviewDetailsFromXHandle(
        { handle: message.handle },
        sendResponse,
      );
      break;

    case 'FETCH_VOUCH_DETAILS_FROM_ADDRESS':
      await VouchDataHandler.handleVouchDetailsFromEthAddress(
        { address: message.address },
        sendResponse,
      );
      break;

    case 'FETCH_VOUCH_DETAILS_FROM_HANDLE':
      await VouchDataHandler.handleVouchDetailsFromXHandle(
        { handle: message.handle },
        sendResponse,
      );
      break;

    case 'CONVERT_ENS_TO_ETH_ADDRESS':
      await ENSAddressHandler.fetchAddressFromENS({ ens: message.ens }, sendResponse);
      break;

    default: {
      const exhaustiveCheck: never = message;
      sendResponse({ error: exhaustiveCheck, success: false });
    }
  }
}

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  (async () => {
    try {
      await handleMessage(message, sendResponse);
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: 'Failed to process request' });
    }
  })();

  return true;
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  // Send a message to the content script when the history state is updated
  chrome.tabs.sendMessage(details.tabId, {
    action: HISTORY_STATE_UPDATED,
  });
});
