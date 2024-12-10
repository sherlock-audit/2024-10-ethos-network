type EntityBase = {
  start: number;
  end: number;
};

type AnnotationEntity = EntityBase & {
  probability: number;
  type: string;
  normalized_text: string;
};

type HashtagEntity = EntityBase & {
  tag: string;
};

type MentionEntity = EntityBase & {
  username: string;
  id: string;
};

type UrlEntity = EntityBase & {
  /**
   * The URL in the format tweeted by the user.
   */
  url: string;
  /**
   * The fully resolved URL.
   */
  expanded_url: string;
  /**
   * The URL as displayed in the Twitter client.
   */
  display_url: string;
  status: number;
  title: string;
  description: string;
  /**
   * The full destination URL.
   */
  unwound_url: string;
  images: Array<{
    url: string;
    width: number;
    height: number;
  }>;
};

/**
 * Docs: https://developer.x.com/en/docs/x-api/tweets/search/api-reference/get-tweets-search-recent
 */
type SearchedTweet = {
  id: string;
  author_id: string;
  text: string;
  created_at: string;
  edit_history_tweet_ids: string[];
  entities: {
    annotations?: AnnotationEntity[];
    hashtags?: HashtagEntity[];
    mentions?: MentionEntity[];
    urls?: UrlEntity[];
  };
};

export type SearchTweetResponse = {
  data?: SearchedTweet[];
  meta: {
    newest_id: string;
    oldest_id: string;
    result_count: number;
  };
};
