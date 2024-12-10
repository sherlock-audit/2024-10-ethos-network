'use client';

import { css } from '@emotion/react';
import { vouchContractName } from '@ethos/contracts';
import { fromUserKey, unvouchActivity, vouchActivity } from '@ethos/domain';
import { Col, Flex, Row, Typography } from 'antd';
import { notFound, useParams } from 'next/navigation';
import { ActivityComments } from '../../_components/activity-comments.component';
import { ActivityCta } from '../../_components/activity-cta.component';
import { VouchCard } from 'components/activity-cards/vouch-card.component';
import { ExcludePwaMiddleware } from 'components/auth/exclude-pwa-middleware';
import { ExternalReferrerRequiredWrapper } from 'components/auth/external-referrer-required.component';
import { HideIfTargetIsCurrentUserWrapper } from 'components/auth/hide-if-target-is-current-user-wrapper.component';
import { useCurrentUser } from 'contexts/current-user.context';
import { useEnsureActivitySlug } from 'hooks/use-ensure-activity-slug';
import { useActivity, useActivityVotes } from 'hooks/user/activities';

const { Title } = Typography;

export default function Page() {
  const params = useParams<{ rest: string[] }>();
  const { rest } = params;

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
    <Row>
      <HideIfTargetIsCurrentUserWrapper target={fromUserKey(vouch.subject.userkey)}>
        <ExcludePwaMiddleware>
          <ExternalReferrerRequiredWrapper>
            <ActivityCta target={fromUserKey(vouch.subject.userkey)} />
          </ExternalReferrerRequiredWrapper>
        </ExcludePwaMiddleware>
      </HideIfTargetIsCurrentUserWrapper>
      <Col
        xs={{ span: 24 }}
        sm={{ span: 20, offset: 2 }}
        md={{ span: 16, offset: 4 }}
        lg={{ span: 14, offset: 5 }}
      >
        <Flex vertical gap={35}>
          <Flex vertical gap={20}>
            <Title
              level={2}
              css={css`
                display: flex;
                align-items: center;
                gap: 6px;
              `}
            >
              {vouch.data.archived ? 'Unvouch' : 'Vouch'} for {vouch.subject.name}
            </Title>
            <VouchCard
              info={{
                ...vouch,
                type: vouch.data.archived ? unvouchActivity : vouchActivity,
              }}
              userVotes={userVotes}
              hideComments
              truncateContent={false}
              isClickable={false}
            />
          </Flex>

          <ActivityComments
            id={id}
            activityContract={vouchContractName}
            commentCount={vouch.replySummary.count}
            hideCloseButton
          />
        </Flex>
      </Col>
    </Row>
  );
}
