import { xComHelpers } from '@ethos/attestation';
import { webUrlMap } from '@ethos/env';
import { vi } from 'vitest';
import { type SearchTweetResponse } from '../../../common/net/twitter/twitter-official.type.js';
import { findValidTweet } from '../x-attestation.utils.js';

vi.mock('../../../common/config', () => ({
  config: {
    ETHOS_ENV: 'dev',
  },
}));

describe('findValidTweet', () => {
  const authorId = '1234567890';
  const address = '0x1234567890abcdef1234567890abcdef12345678';
  const hashtag = xComHelpers.entities.hashtag.replace(/^#/, '');
  const mention = xComHelpers.entities.mention.replace(/^@/, '');

  it('should return undefined if no valid tweet is found', () => {
    const tweets: SearchTweetResponse = {
      meta: {
        newest_id: '9876543210',
        oldest_id: '1234567890',
        result_count: 0,
      },
    };

    expect(findValidTweet(tweets, authorId, address)).toBeUndefined();
  });

  it('should return the first valid tweet found with unfurled link', () => {
    const tweets: SearchTweetResponse = {
      meta: {
        newest_id: '9876543210',
        oldest_id: '1234567890',
        result_count: 1,
      },
      data: [
        {
          id: '1234567890',
          author_id: authorId,
          text: xComHelpers.generateTweetContent(webUrlMap.dev, address),
          created_at: '2024-09-18T13:58:58.000Z',
          edit_history_tweet_ids: [],
          entities: {
            hashtags: [{ start: 100, end: 110, tag: hashtag }],
            mentions: [
              {
                start: 120,
                end: 130,
                username: mention,
                id: '1234567890',
              },
            ],
            urls: [
              {
                start: 147,
                end: 170,
                url: 'https://t.co/bVrC0rUdUM',
                expanded_url: 'https://ethos.network',
                display_url: 'ethos.network',
                images: [
                  {
                    url: 'https://example.com',
                    width: 1200,
                    height: 630,
                  },
                  {
                    url: 'https://example.com',
                    width: 150,
                    height: 150,
                  },
                ],
                status: 200,
                title: 'Ethos',
                description: 'Test description',
                unwound_url: 'https://www.ethos.network/',
              },
              {
                start: 190,
                end: 213,
                url: 'https://t.co/Vlmby3tIUd',
                expanded_url: `https://dev.ethos.network/profile/${address}`,
                display_url: 'dev.ethos.network/profile/0x1234…',
                images: [
                  {
                    url: 'https://example.com',
                    width: 1200,
                    height: 630,
                  },
                  {
                    url: 'https://example.com',
                    width: 150,
                    height: 150,
                  },
                ],
                status: 200,
                title: '[TESTNET DATA] test title',
                description: 'Test description',
                unwound_url: `https://dev.ethos.network/profile/${address}`,
              },
            ],
          },
        },
      ],
    };

    expect(findValidTweet(tweets, authorId, address)).toBeTruthy();
  });

  it('should return the first valid tweet found w/o unfurled link', () => {
    const tweets: SearchTweetResponse = {
      meta: {
        newest_id: '9876543210',
        oldest_id: '1234567890',
        result_count: 1,
      },
      data: [
        {
          id: '1234567890',
          author_id: authorId,
          text: xComHelpers.generateTweetContent(webUrlMap.dev, address),
          created_at: '2024-09-18T13:58:58.000Z',
          edit_history_tweet_ids: [],
          entities: {
            hashtags: [{ start: 100, end: 110, tag: hashtag }],
            mentions: [
              {
                start: 120,
                end: 130,
                username: mention,
                id: '1234567890',
              },
            ],
          },
        },
      ],
    };

    expect(findValidTweet(tweets, authorId, address)).toBeTruthy();
  });
});
