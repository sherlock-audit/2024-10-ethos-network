import { css } from '@emotion/react';
import { type PendingInvitation, type ScoreImpact } from '@ethos/domain';
import { Flex, List, Tag, theme, Typography } from 'antd';
import { type ReactNode, useEffect, useMemo } from 'react';
import { zeroAddress, type Address } from 'viem';
import { UserAvatar } from 'components/avatar/avatar.component';
import { MarkEmailReadIcon } from 'components/icons';
import { LottieLoader } from 'components/loading-wrapper/lottie-loader.component';
import { ScoreImpactTag } from 'components/score-impact-tag/score-impact-tag.component';
import { tokenCssVars } from 'config';
import { placeholderActor, useActor } from 'hooks/user/activities';
import { type PendingInvitationsResponse, usePendingInvitationsBySubject } from 'hooks/user/lookup';

export type AvailableInvitesListProps = {
  inviteeAddress: Address | null;
  originalInviterProfileId: number | null;
  selectedInvitation: PendingInvitation | null;
  invitationSelected: (invitation: PendingInvitation) => void;
  invitationHover?: (invitation: PendingInvitation | null) => void;
  preselectFirstInvitation?: boolean;
};

const INVITES_LIST_PAGE_SIZE = 3;

export function AvailableInvitesList({
  inviteeAddress,
  originalInviterProfileId,
  selectedInvitation,
  invitationSelected,
  invitationHover,
  preselectFirstInvitation,
}: AvailableInvitesListProps) {
  const { data, isLoading } = usePendingInvitationsBySubject({
    address: inviteeAddress ?? zeroAddress,
  });

  // place the original inviter at the top of the list
  const reorderData = (
    data: PendingInvitationsResponse,
    originalInviterProfileId: number,
  ): PendingInvitationsResponse => {
    const foundItem = data.find((entry) => entry.id === originalInviterProfileId);

    if (!foundItem) {
      return data;
    }

    return [foundItem, ...data.filter((profile) => profile.id !== originalInviterProfileId)];
  };

  const dataSource = useMemo<PendingInvitationsResponse>(
    () => reorderData(data ?? [], originalInviterProfileId ?? 0),
    [data, originalInviterProfileId],
  );

  useEffect(() => {
    if (preselectFirstInvitation && dataSource.length > 0) {
      invitationSelected(dataSource[0]);
    }
  }, [preselectFirstInvitation, dataSource, originalInviterProfileId, invitationSelected]);

  return (
    <div
      css={css`
        width: 75%;
        margin: 0 auto;
      `}
    >
      <List
        css={css`
          width: 100%;

          & .ant-list-items {
            width: 100%;
          }

          & .ant-list-item {
            padding: 0;
            width: 100%;
          }
        `}
        pagination={{
          position: 'bottom',
          align: 'center',
          total: dataSource.length,
          pageSize: INVITES_LIST_PAGE_SIZE,
          hideOnSinglePage: true,
        }}
        loading={{ spinning: isLoading, indicator: <LottieLoader size={24} /> }}
        locale={{ emptyText: 'No invites available' }}
        dataSource={dataSource}
        renderItem={(pendingInvitation, index) => (
          <>
            <List.Item key={index}>
              <AvailableInviteItem
                invitationDetails={pendingInvitation}
                scoreSimulation={pendingInvitation.impact}
                onMouseEnter={() => {
                  invitationHover?.(pendingInvitation);
                }}
                onMouseLeave={() => {
                  invitationHover?.(null);
                }}
                itemLabel={
                  pendingInvitation.id === originalInviterProfileId ? (
                    <Tag
                      icon={<MarkEmailReadIcon />}
                      bordered={false}
                      css={css`
                        background: transparent;
                        padding: 0;
                        color: ${tokenCssVars.colorPrimary};
                      `}
                    >
                      Invite link you used
                    </Tag>
                  ) : (
                    <div />
                  )
                }
                selected={pendingInvitation?.id === selectedInvitation?.id}
                invitationSelected={invitationSelected}
              />
            </List.Item>
            {dataSource.length === 1 && (
              <List.Item key={index + 1}>
                <AvailableInviteItem invitationDetails={pendingInvitation} isPlaceholder />
              </List.Item>
            )}
          </>
        )}
      />
    </div>
  );
}

export type AvailableInviteItemProps = {
  invitationDetails: PendingInvitation;
  itemLabel?: ReactNode;
  selected?: boolean;
  displayScore?: boolean;
  scoreSimulation?: {
    value: number | string;
    impact: `${ScoreImpact}`;
  };
  invitationSelected?: (invitation: PendingInvitation) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  isPlaceholder?: boolean;
};

export function AvailableInviteItem({
  invitationDetails,
  itemLabel,
  selected,
  invitationSelected,
  displayScore = true,
  scoreSimulation,
  onMouseEnter,
  onMouseLeave,
  isPlaceholder = false,
}: AvailableInviteItemProps) {
  const { token } = theme.useToken();

  let user = useActor({ profileId: invitationDetails.id });

  if (isPlaceholder) {
    displayScore = true;
    scoreSimulation = {
      value: '??',
      impact: 'POSITIVE',
    };
    user = placeholderActor({ profileId: invitationDetails.id });
    user.name = 'Ask a friend';
    itemLabel = (
      <Flex>
        <Typography.Text type="secondary">
          Want a bigger boost? Secure a different invite.
        </Typography.Text>
      </Flex>
    );
  }

  return (
    <Flex
      gap={15}
      align="center"
      onClick={() => {
        invitationSelected?.(invitationDetails);
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={selected ? 'selected' : ''}
      css={css`
        padding: ${token.paddingSM}px ${token.paddingLG}px;
        border-radius: ${token.borderRadiusLG}px;
        width: 100%; // Ensure full width
        margin-top: 5px;
        transition: all var(--ant-motion-duration-slow);
        border: 2px solid transparent;

        ${!isPlaceholder &&
        css`
          cursor: pointer;

          &:hover,
          &.selected {
            background: ${tokenCssVars.colorBgBase};
          }

          &.selected {
            border: 2px solid ${tokenCssVars.colorPrimary};
          }
        `}
      `}
    >
      <UserAvatar
        size="large"
        actor={user}
        elevated={selected}
        showHoverCard={!isPlaceholder}
        showScore={!isPlaceholder}
        renderAsLink={!isPlaceholder}
        openLinkInNewTab
      />
      <Flex
        flex={1} // Allow this container to grow and take available space
        justify="space-between" // Spread out the content
        align="center"
        css={css`
          min-width: 0;
          width: 100%;
        `}
      >
        <Flex
          vertical
          css={css`
            text-align: left;
            flex: 1;
            min-width: 0;
          `}
        >
          <Typography.Text
            css={css`
              font-size: ${token.fontSizeLG}px;
              line-height: 32px;
              font-weight: ${token.fontWeightStrong};
            `}
            ellipsis
          >
            {user.name}
          </Typography.Text>
          {itemLabel}
        </Flex>
        {displayScore && scoreSimulation && (
          <ScoreImpactTag value={scoreSimulation.value} impact={scoreSimulation.impact} />
        )}
      </Flex>
    </Flex>
  );
}
