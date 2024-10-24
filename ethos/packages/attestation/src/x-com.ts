function getVerifyXAttestationMsg(account: string): string {
  return `Sign message to verify x.com attestation for ${account}`;
}

function extractXAccount(evidence: string): string {
  const value = evidence.toLowerCase().trim();

  // Ex.: '@username' -> 'username'
  if (value.startsWith('@')) {
    return value.slice(1);
  }

  if (['twitter.com', 'x.com'].some((domain) => value.includes(domain))) {
    // 'x.com/username' -> 'https://x.com/username'
    const url = value.startsWith('http') ? value : `https://${value}`;

    try {
      const { pathname } = new URL(url);

      // Ex.: 'https://twitter.com/username' -> 'username'
      return pathname.split('/')[1];
    } catch {
      // Do nothing
    }
  }

  return value;
}

function generateIntentTweetUrl(tweetContent: string): string {
  const searchParams = new URLSearchParams({ text: tweetContent });

  return `https://twitter.com/intent/tweet?${searchParams.toString()}`;
}

const hashtag = '#ethos';
const mention = '@ethos_network';

function getProfileUrl(baseUrl: string, address: string): string {
  return `${baseUrl}/profile/${address}`;
}

function generateTweetContent(baseUrl: string, address: string): string {
  const profileUrl = getProfileUrl(baseUrl, address);

  return [
    `This tweet links my ${mention} profile during the private testnet.`,
    `Ethos is working to make crypto a safe space through onchain credibility → https://ethos.network`,
    `Here’s my Ethos profile:\n${profileUrl} ${hashtag}`,
  ].join('\n\n');
}

function shareReviewTweetContent(
  activityUrl: string,
  reviewType: 'negative' | 'neutral' | 'positive',
  twitterHandle: string,
): string {
  const safeHandle = twitterHandle ? ` for @${twitterHandle}` : '';

  return [
    `I just left a ${reviewType} review${safeHandle} on ${mention}`,
    `${activityUrl} ${hashtag}`,
  ].join('\n\n');
}

function shareVouchTweetContent(
  activityUrl: string,
  vouchAmount: string,
  twitterHandle: string,
): string {
  const safeHandle = twitterHandle ? ` for @${twitterHandle}` : '';

  return [
    `I just vouched ${vouchAmount} ${safeHandle} on ${mention}`,
    `${activityUrl} ${hashtag}`,
  ].join('\n\n');
}

function getTweetKeywords(): string[] {
  return [hashtag, mention];
}

export const xComHelpers = {
  generateIntentTweetUrl,
  generateTweetContent,
  shareReviewTweetContent,
  shareVouchTweetContent,
  getTweetKeywords,
  getVerifyMsg: getVerifyXAttestationMsg,
  extractAccount: extractXAccount,
  getProfileUrl,
  entities: {
    hashtag,
    mention,
  },
};
