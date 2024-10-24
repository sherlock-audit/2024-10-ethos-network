import { css } from '@emotion/react';
import { vouchContractName } from '@ethos/contracts';
import {
  unvouchActivity,
  type UnvouchActivityInfo,
  vouchActivity,
  type VouchActivityInfo,
} from '@ethos/domain';
import { formatEth } from '@ethos/helpers';
import { Flex, Typography, theme, Tooltip, Button } from 'antd';
import Link from 'next/link';
import { ActivityIconTag } from './ActivityIconTag';
import { CardFooter } from './card-footer.component';
import { CardHeaderTitle } from './card-header-title.component';
import { CardHeader } from './card-header.component';
import { UserAvatar } from 'components/avatar/avatar.component';
import { ExpandableParagraph } from 'components/expandable-paragraph/expandable-paragraph.component';
import { ClipboardIcon } from 'components/icons';
import { PreventInheritedLinkClicks } from 'components/prevent-inherited-link-clicks/prevent-inherited-link-clicks.component';
import { tokenCssVars } from 'config';
import { useUnvouchModal } from 'contexts/unvouch-modal.context';
import { parseVouchMetadata } from 'hooks/api/blockchain-manager/metadata.utils';
import { useIsConnectedProfile } from 'hooks/user/utils';
import { type BulkVotes } from 'types/activity';
import { useCopyToClipboard } from 'utils/clipboard';
import { getActivityUrl } from 'utils/routing';
import { truncateTitle } from 'utils/truncate-title';
import { getVouchTxnUrl } from 'utils/vouch';

const { Title, Paragraph } = Typography;

type Props = {
  info: VouchActivityInfo | UnvouchActivityInfo;
  userVotes?: BulkVotes;
  hideFooter?: boolean;
  hideVouchAmount?: boolean;
  hideActions?: boolean;
  hideTimestamp?: boolean;
  inlineClipboardIcon?: boolean;
  shadowed?: boolean;
};

type Vouch = Props['info']['data'];
type ActivityType = Props['info']['type'];

function VouchAmount({ vouch, type }: { vouch: Vouch; type: ActivityType }) {
  return (
    <ActivityIconTag hasPadding>
      <Tooltip title={`${type === vouchActivity ? 'Vouch' : 'Unvouch'} amount`}>
        <Title
          level={5}
          css={css`
            font-weight: bold;
            letter-spacing: 0.0375rem;
            color: ${tokenCssVars.colorPrimary};
            text-decoration: ${type === unvouchActivity ? 'line-through' : 'none'};
          `}
        >
          {formatEth(vouch.archived ? vouch.withdrawn : vouch.balance)}
        </Title>
      </Tooltip>
    </ActivityIconTag>
  );
}

function VouchDescription({
  vouch,
  description,
  type,
}: {
  vouch: Vouch;
  description?: string;
  type: ActivityType;
}) {
  const { token } = theme.useToken();

  if (type === unvouchActivity) {
    return (
      <Typography.Text
        type="secondary"
        css={{
          fontSize: token.fontSizeSM,
        }}
      >
        The voucher marked the unvouching as{' '}
        <span
          css={{
            color: vouch.unhealthy ? tokenCssVars.colorError : tokenCssVars.colorSuccess,
          }}
        >
          {vouch.unhealthy ? 'Unhealthy' : 'Healthy'}.
        </span>
      </Typography.Text>
    );
  }
  if (description) {
    return <ExpandableParagraph>{description}</ExpandableParagraph>;
  }

  return null;
}

export function VouchCard({
  info,
  userVotes,
  hideFooter,
  hideVouchAmount,
  hideActions,
  hideTimestamp,
  inlineClipboardIcon,
  shadowed,
}: Props) {
  const copyToClipboard = useCopyToClipboard();
  const { token } = theme.useToken();
  const { data: vouch, author, subject, votes, replySummary, events, type } = info;
  const { openUnvouchModal } = useUnvouchModal();

  const isCurrentUser = useIsConnectedProfile(vouch.authorProfileId);

  const vouchTitle = truncateTitle(vouch.comment);
  const { description } = parseVouchMetadata(vouch?.metadata);
  const txnHash = getVouchTxnUrl(vouch.archived && type === unvouchActivity, events);

  const copyShareUrl = async () => {
    await copyToClipboard(getActivityUrl(info, true), 'Link successfully copied');
  };

  return (
    <Link
      href={getActivityUrl(info)}
      css={css`
        display: block;
        width: 100%;
      `}
    >
      <Flex
        css={css`
          background-color: ${tokenCssVars.colorBgContainer};
          border-radius: ${token.borderRadius}px;

          ${shadowed
            ? css`
                box-shadow: ${tokenCssVars.boxShadowSecondary};
              `
            : null}
        `}
        justify="stretch"
        vertical
      >
        <CardHeader
          title={
            <>
              <CardHeaderTitle author={author} subject={subject} type={type} />
              {inlineClipboardIcon ? (
                <PreventInheritedLinkClicks>
                  <Tooltip title="Copy activity url">
                    <Button
                      onClick={copyShareUrl}
                      type="text"
                      icon={
                        <ClipboardIcon
                          css={css`
                            color: ${tokenCssVars.colorPrimary};
                          `}
                        />
                      }
                    />
                  </Tooltip>
                </PreventInheritedLinkClicks>
              ) : null}
            </>
          }
          timestamp={
            type === vouchActivity
              ? vouch.activityCheckpoints.vouchedAt
              : vouch.activityCheckpoints.unvouchedAt
          }
          txnHash={txnHash}
          onWithdraw={
            isCurrentUser && !vouch.archived
              ? () => {
                  openUnvouchModal(vouch);
                }
              : undefined
          }
          pathname={getActivityUrl(info)}
          isPreview={hideActions}
          hideTimestamp={hideTimestamp}
        />
        <Flex
          css={css`
            padding: 11px 18px;
          `}
          gap={18}
          flex={1}
        >
          <UserAvatar actor={author} size="large" />
          <Flex vertical flex={1}>
            <Flex justify="space-between" gap={18} align="flex-start">
              <Paragraph>
                <Title level={4}>&ldquo;{vouchTitle}&rdquo;</Title>
              </Paragraph>
              {!hideVouchAmount ? <VouchAmount vouch={vouch} type={type} /> : null}
            </Flex>
            <VouchDescription vouch={vouch} description={description} type={type} />
            <PreventInheritedLinkClicks>
              {!hideFooter ? (
                <CardFooter
                  targetId={vouch.id}
                  targetContract={vouchContractName}
                  votes={votes}
                  replySummary={replySummary}
                  currentVote={userVotes?.[vouchContractName]?.[vouch.id]?.userVote ?? null}
                  pathname={getActivityUrl(info)}
                />
              ) : null}
            </PreventInheritedLinkClicks>
          </Flex>
        </Flex>
      </Flex>
    </Link>
  );
}
