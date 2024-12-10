// --- Utility Section ---
/**
 * Matches Ethereum wallet addresses (e.g., "0xd8da6bf26964af9d7eed9e03e53415d37aa96045") but ignores them if part of a domain or URL path
 * (e.g., "http://example.com/0xd8da6bf26964af9d7eed9e03e53415d37aa96045").
 * It also allows Ethereum addresses at the end of sentences or when followed by punctuation (e.g., "0xd8da6bf26964af9d7eed9e03e53415d37aa96045.").
 *
 * Breakdown:
 * 1. `(?<![a-zA-Z0-9./])` - Excludes matches preceded by alphanumeric characters, dots, or slashes to avoid matching part of a domain or URL path.
 * 2. `0x[a-fA-F0-9]{40}` - Matches Ethereum wallet addresses (a "0x" prefix followed by 40 hexadecimal characters).
 * 3. `(?=\s|[.,!?]?|$)` - Ensures the match is followed by a space, optional punctuation, or the end of the string.
 *
 * Example:
 * ```js
 * const regex = /(?<![a-zA-Z0-9./])0x[a-fA-F0-9]{40}(?=\s|[.,!?]?|$)/;
 * const text1 = "This is a dummy wallet 0xd8da6bf26964af9d7eed9e03e53415d37aa96045";
 * const text2 = "Visit this wallet: 0xd8da6bf26964af9d7eed9e03e53415d37aa96045.";
 * const text3 = "http://example.com/0xd8da6bf26964af9d7eed9e03e53415d37aa96045";
 *
 * text1.match(regex); // Output: [ '0xd8da6bf26964af9d7eed9e03e53415d37aa96045' ]
 * text2.match(regex); // Output: [ '0xd8da6bf26964af9d7eed9e03e53415d37aa96045' ]
 * text3.match(regex); // Output: null
 * ```
 *
 * @returns {RegExp} Regular expression to match Ethereum wallet addresses but exclude links, domains, or paths, and allow matches at the end of sentences.
 */
export const ETHEREUM_ADDRESS_REGEX = /(?<![a-zA-Z0-9./?&=])0x[a-fA-F0-9]{40}(?![a-zA-Z0-9])/g;

/**
 * Matches Ethereum ENS addresses (e.g., "vitalik.eth" or "official.vitalik.eth") but ignores them if part of a domain or URL path
 * (e.g., "vitalik.eth.limo" or "vitalik.eth/general"), and excludes matches when preceded by "http://" or "https://".
 * It also allows ENS names at the end of sentences or when followed by punctuation (e.g., "vitalik.eth.").
 *
 * Breakdown:
 * 1. `(?<!https?:\/\/)` - Excludes matches preceded by "http://" or "https://".
 * 2. `(?<!\.)` - Excludes matches preceded by a period to avoid matching in domain names.
 * 3. `(?!\.\w|\/)` - Excludes matches followed by a period with more characters (e.g., `.limo`) or a forward slash (e.g., `/general`).
 * 4. `[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)?\.eth` - Matches simple ENS names (e.g., "vitalik.eth") and multi-level ENS names (e.g., "official.vitalik.eth").
 * 5. `(?=\s|[.,!?]?|$)` - Ensures the match is followed by a space, optional punctuation, or the end of the string.
 *
 * Example:
 * ```js
 * const regex = /(?<!https?:\/\/)(?<!\.)[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)?\.eth(?!\.\w|\/)(?=\s|[.,!?]?|$)/;
 * const text1 = "But remember nobody is perfect, neither is vitalik.eth";
 * const text2 = "Check official.vitalik.eth.limo/general";
 * const text3 = "My ENS is vitalik.eth.";
 *
 * text1.match(regex); // Output: [ 'vitalik.eth' ]
 * text2.match(regex); // Output: null
 * text3.match(regex); // Output: [ 'vitalik.eth' ]
 * ```
 *
 * @returns {RegExp} Regular expression to match ENS names (e.g., "vitalik.eth", "official.vitalik.eth") but exclude links, domains, or paths, and allow matches at the end of sentences.
 */

export const ENS_NAME_REGEX =
  /(?<!https?:\/\/[^\s]*\/?)[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)?\.eth\b(?!\.\w|[a-zA-Z0-9-])(?=\s|[.,!?]?|$)/g;

export const USER_AVATAR_CONTAINER_REGEX = /UserAvatar-Container-(\w+)/;
