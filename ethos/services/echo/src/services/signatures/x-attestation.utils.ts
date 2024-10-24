import { xComHelpers } from '@ethos/attestation';
import { webUrlMap } from '@ethos/env';
import { config } from '../../common/config';
import { type SearchTweetResponse } from '../../common/net/twitter/twitter-official.type';

type Tweet = NonNullable<SearchTweetResponse['data']>[number];

export function findValidTweet(
  tweets: SearchTweetResponse,
  authorId: string,
  address: string,
): Tweet | undefined {
  const profileUrl = xComHelpers.getProfileUrl(webUrlMap[config.ETHOS_ENV], address);

  return tweets.data?.find(
    (tweet) =>
      // Check if the tweet author is the same as the claimed Twitter username
      tweet.author_id === authorId &&
      // Check if the tweet mentions Ethos Network twitter account
      tweet.entities.mentions?.some(
        ({ username }) => xComHelpers.entities.mention === `@${username}`,
      ) &&
      // Check if the tweet contains the Ethos hashtag
      tweet.entities.hashtags?.some(({ tag }) => xComHelpers.entities.hashtag === `#${tag}`) &&
      // Check if the tweet contains the profile URL. If it's unfurled, it will
      // be in "entities.urls" and the "text" contains a shortened URL.
      // Otherwise, the full URL will be in the "text".
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      (tweet.entities.urls?.some(({ unwound_url: originalUrl }) => originalUrl === profileUrl) ||
        tweet.text.includes(profileUrl)),
  );
}
