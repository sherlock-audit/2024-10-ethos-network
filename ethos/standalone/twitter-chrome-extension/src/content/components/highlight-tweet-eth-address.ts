// --- Style Handling Section ---
import { LogoSvg } from '../../icons/logo.svg.ts';
import { ETHOS_WEB_URL } from '../config/constants.ts';
import { ENS_NAME_REGEX, ETHEREUM_ADDRESS_REGEX } from '../config/regex.ts';
import {
  getScoresMapForAddresses,
  getScoresMapForEnsNames,
} from '../data-fetching/credibility-score-by-address-helper.ts';
import { setBackgroundColorName } from '../helpers/components-helper.ts';

function injectStyles(bgColor: string) {
  let ethAddressBgColor = '';

  if (bgColor === 'dark') {
    ethAddressBgColor = '#232320';
  } else if (bgColor === 'dim') {
    ethAddressBgColor = '#0A121A';
  } else if (bgColor === 'light') {
    ethAddressBgColor = '#EAEAEA';
  }

  const style = document.createElement('style');
  style.innerHTML = `
        .highlighted-address, .highlighted-ens-name {
            background-color: ${ethAddressBgColor};
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 5px;
            width: fit-content;
            border-radius: 5px;
            transition: transform 0.2s ease;
            cursor: pointer;
        }

        .highlighted-address:hover, .highlighted-ens-name:hover {
            transform: scale(1.02);
        }

        .highlighted-ethos-icon {
            width: 16px;
            height: 16px;
        }

        .highlighted-address-text, .highlighted-ens-name-text {
            line-height: 14px;
            font-size: 14px;
        }
    `;
  document.head.appendChild(style);
}

// --- Content Enhancement Section ---
async function enhanceTweetContent(post: Element) {
  const handleElement = post.querySelector<HTMLElement>(
    '[class="css-146c3p1 r-dnmrzs r-1udh08x r-3s2u2q r-bcqeeo r-1ttztb7 r-qvutc0 r-37j5jr r-a023e6 r-rjixqe r-16dba41 r-18u37iz r-1wvb978"]',
  );
  const handleName = handleElement ? handleElement.textContent : 'Unknown';

  const tweetTextElement = post.querySelector<HTMLElement>('[lang]');

  if (tweetTextElement && !tweetTextElement.dataset.processed) {
    Array.from(tweetTextElement.children).forEach(async (childElement) => {
      const addressMatches = childElement.innerHTML?.match(ETHEREUM_ADDRESS_REGEX) ?? [];
      const addressesDataMap = await getScoresMapForAddresses(addressMatches);

      for (const match of addressMatches) {
        const trimmedMatch = match.trim();
        const scoreData = addressesDataMap[trimmedMatch];

        const { color, address } = scoreData;

        childElement.innerHTML = childElement.innerHTML.replace(
          address,
          `<span class="highlighted-address" data-eth-address="${address}" data-handle="${handleName}">
              ${LogoSvg({
                className: 'highlighted-ethos-icon',
                color,
              })}
              <a href="${ETHOS_WEB_URL}/profile/${address}" target="_blank" class="highlighted-address-text">${trimmedMatch}</a>
            </span>`,
        );
      }

      const ensNameMatches = childElement.innerHTML?.match(ENS_NAME_REGEX) ?? [];
      const ensNamesDataMap = await getScoresMapForEnsNames(ensNameMatches);

      for (const match of ensNameMatches) {
        const trimmedMatch = match.trim();
        const scoreData = ensNamesDataMap[trimmedMatch];

        const { color, ensName } = scoreData;

        childElement.innerHTML = childElement.innerHTML.replace(
          ensName,
          `<span class="highlighted-ens-name" data-ens-name="${ensName}" data-handle="${handleName}">
            ${LogoSvg({
              className: 'highlighted-ethos-icon',
              color,
            })}
            <a href="${ETHOS_WEB_URL}/profile/${match}" target="_blank" class="highlighted-ens-name-text">${match}</a>
            </span>`,
        );
      }
    });

    tweetTextElement.dataset.processed = 'true';
  }
}

// --- Main Execution Section ---
export function initializeHighlightTweetEthAddress() {
  highlightTweetEthAddress();

  const observer = new MutationObserver(highlightTweetEthAddress);
  observer.observe(document.body, { childList: true, subtree: true });
}

function highlightTweetEthAddress() {
  setBackgroundColorName().then((bgColor) => {
    injectStyles(bgColor);
  });

  const posts = document.querySelectorAll<HTMLElement>('[data-testid="tweet"]');
  posts.forEach((post) => {
    enhanceTweetContent(post);
  });
}
