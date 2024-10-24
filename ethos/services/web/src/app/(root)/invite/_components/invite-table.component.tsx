import { CloseOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { type Invitation, InvitationStatus, type ScoreImpact } from '@ethos/domain';
import { duration, getUnixTime } from '@ethos/helpers';
import { bondingPeriod } from '@ethos/score';
import { Badge, Button, Flex, Progress, Space, theme, Tooltip } from 'antd';
import { type PresetStatusColorType } from 'antd/es/_util/colors';
import { type ColumnsType } from 'antd/es/table';
import { useState } from 'react';
import { type Address } from 'viem';
import { RevokeModal } from './revoke-modal.component';
import { RelativeDateTime } from 'components/RelativeDateTime';
import { ClipboardIcon } from 'components/icons';
import { PersonWithAvatar } from 'components/person-with-avatar/person-with-avatar.component';
import { ScoreImpactTag } from 'components/score-impact-tag/score-impact-tag.component';
import { InfiniteTable } from 'components/table/InfiniteTable';
import { tokenCssVars } from 'config';
import { DEFAULT_PAGE_SIZE } from 'constant/constants';
import { useCurrentUser } from 'contexts/current-user.context';
import { useInvitationsByAuthorInfinite } from 'hooks/user/lookup';
import { useCopyToClipboard } from 'utils/clipboard';
import { generateProfileInviteUrl } from 'utils/routing';

const statusMapping = {
  [InvitationStatus.ACCEPTED]: 'Accepted',
  [InvitationStatus.INVITED]: 'Invited',
  [InvitationStatus.ACCEPTED_OTHER_INVITATION]: 'Accepted other invitation',
};

const statusOrder = {
  [InvitationStatus.ACCEPTED]: 1,
  [InvitationStatus.INVITED]: 2,
  [InvitationStatus.ACCEPTED_OTHER_INVITATION]: 3,
};

function renderName(address: Address) {
  return <PersonWithAvatar target={{ address }} nameSize="large" />;
}

function renderDateInvited(date: Date) {
  return (
    <Flex gap={4} align="center">
      <RelativeDateTime
        dateTimeFormat={{ dateStyle: 'long', timeStyle: 'short' }}
        timestamp={getUnixTime(date)}
        verbose
      />
    </Flex>
  );
}

function renderStatus(
  status: InvitationStatus,
  invite: Invitation,
  copyInvitationUrl: (address: Address) => Promise<void>,
  setIsRevokeModalOpen: React.Dispatch<React.SetStateAction<boolean>>,
  setSelectedInvite: React.Dispatch<React.SetStateAction<Invitation | null | undefined>>,
) {
  const badgeStatus: Record<InvitationStatus, { status: PresetStatusColorType; color: string }> = {
    [InvitationStatus.ACCEPTED]: { status: 'success', color: tokenCssVars.colorSuccess },
    [InvitationStatus.INVITED]: { status: 'success', color: tokenCssVars.colorPrimary },
    [InvitationStatus.ACCEPTED_OTHER_INVITATION]: {
      status: 'warning',
      color: tokenCssVars.colorWarning,
    },
  };

  const showCopyInvitationLinkButton = invite.status === InvitationStatus.INVITED;
  const showRevokeButton =
    invite.status === InvitationStatus.INVITED ||
    invite.status === InvitationStatus.ACCEPTED_OTHER_INVITATION;

  return (
    <Space direction="horizontal" size="small" css={{ display: 'flex' }}>
      <Badge
        status={badgeStatus[status].status}
        color={badgeStatus[status].color}
        text={<span>{statusMapping[status]}</span>}
      />
      {showCopyInvitationLinkButton && (
        <Tooltip title="Copy invitation url">
          <Button
            type="link"
            onClick={async () => {
              await copyInvitationUrl(invite.recipientAddress);
            }}
            icon={<ClipboardIcon />}
          />
        </Tooltip>
      )}
      {showRevokeButton && (
        <Tooltip title="Revoke">
          <Button
            type="link"
            danger
            css={css`
              padding: 0;
              width: auto;
            `}
            onClick={() => {
              setIsRevokeModalOpen(true);
              setSelectedInvite(invite);
            }}
            icon={<CloseOutlined />}
          />
        </Tooltip>
      )}
    </Space>
  );
}

function renderBondingPeriodRemaining(dateInvited: Date, invite: Invitation) {
  if (invite.status !== InvitationStatus.ACCEPTED) {
    return '-';
  }

  const startTimestampInSecs = getUnixTime(dateInvited);
  const endTimestampInSecs = startTimestampInSecs + duration(1, 'day').toSeconds() * bondingPeriod;
  const currentTimestampInSecs = getUnixTime(new Date());
  const daysRemaining = Math.max(
    0,
    Math.floor((endTimestampInSecs - currentTimestampInSecs) / duration(1, 'day').toSeconds()),
  );

  if (daysRemaining <= 0) {
    return (
      <Flex gap={4} align="center">
        Completed
      </Flex>
    );
  }

  return (
    <Flex gap={4} align="center">
      <Flex
        vertical
        gap="small"
        css={css`
          width: 97%;
        `}
      >
        <Progress
          format={(daysRemaining) =>
            daysRemaining !== undefined
              ? `${Math.round((daysRemaining * bondingPeriod) / 100)} days`
              : '0 days'
          }
          status="active"
          percent={(daysRemaining / bondingPeriod) * 100}
          strokeColor={tokenCssVars.colorPrimary}
          size="small"
        />
      </Flex>
    </Flex>
  );
}

function renderScoreImpact(score: { value: number; impact: ScoreImpact }, invite: Invitation) {
  return invite.status !== InvitationStatus.ACCEPTED ? (
    '-'
  ) : (
    <ScoreImpactTag value={score.value} impact={score.impact} />
  );
}

type ToolTipTitleProps = {
  title: string;
  tooltipContent: string;
};

function ToolTipTitle({ title, tooltipContent }: ToolTipTitleProps) {
  return (
    <Flex gap={4} align="left">
      {title}
      <Tooltip title={tooltipContent}>
        <InfoCircleOutlined
          css={css`
            opacity: 0.55;
          `}
        />
      </Tooltip>
    </Flex>
  );
}

type Props = {
  profileId: number;
};

export function InviteTable({ profileId }: Props) {
  const copyToClipboard = useCopyToClipboard();
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState<Invitation | null>();

  const { token } = theme.useToken();
  const { connectedProfile } = useCurrentUser();

  const { data, isInProgress, isFetching, fetchNextPage } = useInvitationsByAuthorInfinite({
    invitedBy: profileId,
    pagination: { limit: DEFAULT_PAGE_SIZE, offset: 0 },
  });

  const copyInvitationUrl = async (address: Address) => {
    if (!connectedProfile) {
      return;
    }

    await copyToClipboard(
      await generateProfileInviteUrl(connectedProfile.id, address),
      'Link successfully copied',
    );
  };

  const columns: ColumnsType<Invitation> = [
    {
      title: 'Name',
      dataIndex: 'recipientAddress',
      key: 'recipientAddress',
      width: 250,
      render: renderName,
      onHeaderCell: () => ({
        style: { paddingLeft: `${token.padding}px`, height: '54px' },
      }),
      onCell: () => ({ style: { paddingLeft: `${token.padding}px` } }),
    },
    {
      title: 'Invited',
      key: 'dateInvited',
      width: 120,
      dataIndex: 'dateInvited',
      // TODO: Support infinite scroll better
      sorter: (a, b) => a.dateInvited.getTime() - b.dateInvited.getTime(),
      render: renderDateInvited,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 230,
      sorter: (a, b) => statusOrder[a.status] - statusOrder[b.status],
      defaultSortOrder: 'ascend',
      render: function (status: InvitationStatus, invite: Invitation) {
        return renderStatus(
          status,
          invite,
          copyInvitationUrl,
          setIsRevokeModalOpen,
          setSelectedInvite,
        );
      },
    },
    {
      title: (
        <ToolTipTitle
          title="Bonding Period Remaining"
          tooltipContent="The number of days remaining that this user's credibility score influences yours."
        />
      ),
      dataIndex: 'dateInvited',
      key: 'bondingPeriodRemaining',
      width: 200,
      render: function (dateInvited: Date, invite: Invitation) {
        return renderBondingPeriodRemaining(dateInvited, invite);
      },
    },
    {
      title: (
        <ToolTipTitle
          title="Impact to your credibility"
          tooltipContent="How much your credibility score has been impacted by this user's score change during the bonding period."
        />
      ),
      dataIndex: 'score',
      key: 'scoreImpactYourCredibility',
      render: function (score: { value: number; impact: ScoreImpact }, invite: Invitation) {
        return renderScoreImpact(
          { impact: score.impact, value: Math.floor(score.value * 0.2) },
          invite,
        );
      },
    },
    {
      title: (
        <ToolTipTitle
          title="Impact to their credibility"
          tooltipContent="How much did you impact this user's credibility score by inviting them."
        />
      ),
      dataIndex: 'score',
      key: 'scoreImpactTheirCredibility',
      render: function (score: { value: number; impact: ScoreImpact }, invite: Invitation) {
        return renderScoreImpact(score, invite);
      },
    },
  ];
  const isFetchingNewData = !isInProgress && isFetching;

  return (
    <>
      <InfiniteTable
        columns={columns}
        rowKey={(row) => row.id}
        isFetchingNewData={isFetchingNewData}
        isLoading={isInProgress}
        dataSource={data?.values ?? []}
        fetchNextPage={fetchNextPage}
      />
      {selectedInvite?.recipientAddress && (
        <RevokeModal
          isOpen={isRevokeModalOpen}
          address={selectedInvite.recipientAddress}
          close={() => {
            setIsRevokeModalOpen(false);
            setSelectedInvite(null);
          }}
        />
      )}
    </>
  );
}
