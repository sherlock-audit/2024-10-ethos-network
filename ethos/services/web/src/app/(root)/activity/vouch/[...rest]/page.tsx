'use client';

import { unvouchActivity, vouchActivity } from '@ethos/domain';
import { Col, Flex, Typography } from 'antd';
import { notFound } from 'next/navigation';
import { VouchCard } from 'components/activity-cards/vouch-card.component';
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
  const { data: vouch, isFetched } = useActivity(vouchActivity, id, connectedProfile?.id);
  const userVotes = useActivityVotes({ vouch: [id] }).data;

  useEnsureActivitySlug(vouch ?? null);

  if (!vouch || vouch.type !== vouchActivity) {
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
        <Title level={2}>Vouch for {vouch.subject.name}</Title>
        <VouchCard
          info={{
            ...vouch,
            type: vouch.data.archived ? unvouchActivity : vouchActivity,
          }}
          userVotes={userVotes}
        />
      </Flex>
    </Col>
  );
}
