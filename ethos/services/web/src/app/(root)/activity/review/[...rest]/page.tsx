'use client';

import { reviewActivity } from '@ethos/domain';
import { Col, Typography, Flex } from 'antd';
import { notFound } from 'next/navigation';
import { ReviewCard } from 'components/activity-cards/review-card.component';
import { useCurrentUser } from 'contexts/current-user.context';
import { useEnsureActivitySlug } from 'hooks/use-ensure-activity-slug';
import { useActivity, useActivityVotes } from 'hooks/user/activities';

const { Title } = Typography;

type Props = {
  params: { rest: string[] };
};

export default function Page({ params: { rest } }: Props) {
  const id = Number(rest[0]);

  const { connectedProfile } = useCurrentUser();
  const { data: review, isFetched } = useActivity(reviewActivity, id, connectedProfile?.id);
  const userVotes = useActivityVotes({ review: [id] }).data;

  useEnsureActivitySlug(review ?? null);

  if (!review || review.type !== 'review') {
    if (isFetched) {
      notFound();
    }

    return null;
  }

  return (
    <Col
      xs={{ span: 24 }}
      sm={{ span: 20, offset: 2 }}
      md={{ span: 16, offset: 4 }}
      lg={{ span: 14, offset: 5 }}
    >
      <Flex vertical gap={20}>
        <Title level={2}>Review for {review.subject.name}</Title>
        <ReviewCard info={review} userVotes={userVotes} />
      </Flex>
    </Col>
  );
}
