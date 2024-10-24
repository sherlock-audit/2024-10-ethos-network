import { css } from '@emotion/react';
import { type Review } from '@ethos/blockchain-manager';
import { type ActivityActor } from '@ethos/domain';
import { Flex, List, Typography } from 'antd';
import { truncate } from 'lodash-es';
import Link from 'next/link';
import Markdown from 'react-markdown';
import { RelativeDateTime } from 'components/RelativeDateTime';
import { TEXT_PROPS_REVIEW_BY_SCORE } from 'components/activity-cards/review-card.component';
import { UserAvatar } from 'components/avatar/avatar.component';
import { PersonName } from 'components/person-name/person-name.component';
import { useActor } from 'hooks/user/activities';
import { getActivityUrl } from 'utils/routing';

const { Text } = Typography;

export function ReviewItem({ review, onItemClick }: { review: Review; onItemClick?: () => void }) {
  const author = useActor({ address: review.author });

  return (
    <Link
      href={getActivityUrl({
        type: 'review',
        data: review,
      })}
      onClick={onItemClick}
    >
      <List.Item extra={<RelativeDateTime timestamp={review.createdAt} />}>
        <List.Item.Meta
          avatar={<UserAvatar actor={author} />}
          title={<ReviewTitle author={author} score={review.score} />}
          description={
            <Markdown
              css={css`
                p {
                  margin: 0;
                }
              `}
            >
              {truncate(review.comment, { length: 40 })}
            </Markdown>
          }
        />
      </List.Item>
    </Link>
  );
}

function ReviewTitle({ author, score }: { author: ActivityActor; score: Review['score'] }) {
  const reviewTone = (TEXT_PROPS_REVIEW_BY_SCORE[score] ?? TEXT_PROPS_REVIEW_BY_SCORE.neutral).text;

  return (
    <Flex gap={5}>
      <PersonName target={author} />
      <Text>left a {reviewTone} review</Text>
    </Flex>
  );
}
