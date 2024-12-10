import { type Relationship, type ActivityActor, type ActivityInfo } from '@ethos/domain';
import { Table, Typography } from 'antd';
import { useState, useMemo } from 'react';
import { type Address } from 'viem';
import { ethosActivityText } from './interaction-activities.component';
import { InteractionActor } from './interaction-actor.component';
import { InteractionDescription } from './interaction-description.component';
import { interactionUtils } from './interaction.utils';
import { ReviewModal } from 'app/(root)/profile/_components/review-modal/review-modal.component';
import { RelativeDateTime } from 'components/RelativeDateTime';
import { TableWrapper } from 'components/table/TableWrapper';
import { useCurrentUser } from 'contexts/current-user.context';

// just putting in a namespace so people don't accidentally import these anywhere else
const { useRelationshipData, useReviewModal } = interactionUtils;

type RecentInteractionsProps = {
  address: Address | undefined | null;
};

export function RecentInteractions({ address }: RecentInteractionsProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const { isReviewModalOpen, currentReviewTarget, showReviewModal, hideReviewModal } =
    useReviewModal();
  const { connectedProfile } = useCurrentUser();
  const { relationshipActorActivities, isPending } = useRelationshipData(
    address,
    connectedProfile,
    currentPage,
  );

  const sortBy = useMemo(
    () => ({
      lastTransaction: (a: { relationship: Relationship }, b: { relationship: Relationship }) => {
        return (
          new Date(a.relationship.last_transaction_timestamp).getTime() -
          new Date(b.relationship.last_transaction_timestamp).getTime()
        );
      },
      actor: (a: { actor: ActivityActor }, b: { actor: ActivityActor }) =>
        (a.actor.name ?? '').localeCompare(b.actor.name ?? ''),
      activities: (a: { activities: ActivityInfo[] }, b: { activities: ActivityInfo[] }) =>
        a.activities.length - b.activities.length,
    }),
    [],
  );

  const render = useMemo(
    () => ({
      user: ({ relationship, actor }: { relationship: Relationship; actor: ActivityActor }) => (
        <InteractionActor relationship={relationship} actor={actor} />
      ),
      ethosActivity: ({
        relationship,
        activities,
      }: {
        relationship: Relationship;
        activities: ActivityInfo[];
      }) => (
        <Typography.Text>
          {ethosActivityText(activities, () => {
            showReviewModal(relationship.address);
          })}
        </Typography.Text>
      ),
      lastInteraction: ({ relationship }: { relationship: Relationship }) => (
        <InteractionDescription relationship={relationship} />
      ),
      date: ({ relationship }: { relationship: Relationship }) => (
        <RelativeDateTime timestamp={relationship.last_transaction_timestamp} />
      ),
    }),
    [showReviewModal],
  );

  const columns = [
    {
      title: 'User',
      key: 'user',
      sorter: sortBy.actor,
      render: render.user,
    },
    {
      title: 'Ethos Activity',
      key: 'ethosActivity',
      sorter: sortBy.activities,
      render: render.ethosActivity,
    },
    {
      title: 'Last Interaction(s)',
      key: 'lastInteraction',
      render: render.lastInteraction,
    },
    {
      title: 'Date',
      key: 'date',
      sorter: sortBy.lastTransaction,
      render: render.date,
    },
  ];

  return (
    <TableWrapper>
      <Table
        columns={columns}
        dataSource={relationshipActorActivities}
        rowKey={(record) => record.relationship.address}
        loading={isPending}
        pagination={{
          current: currentPage,
          pageSize: interactionUtils.PAGE_SIZE,
          total: relationshipActorActivities?.length,
          onChange: setCurrentPage,
        }}
        scroll={{ x: 'max-content' }}
      />
      {currentReviewTarget && (
        <ReviewModal
          target={currentReviewTarget}
          isOpen={isReviewModalOpen}
          close={hideReviewModal}
        />
      )}
    </TableWrapper>
  );
}
