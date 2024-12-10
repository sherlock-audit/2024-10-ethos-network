import { css } from '@emotion/react';
import { useCopyToClipboard } from '@ethos/common-ui';
import { vouchContractName } from '@ethos/contracts';
import {
  unvouchActivity,
  type UnvouchActivityInfo,
  vouchActivity,
  type VouchActivityInfo,
} from '@ethos/domain';
import { formatEth } from '@ethos/helpers';
import { Flex, Typography, theme, Tooltip, Button } from 'antd';
import { ActivityIconTag } from './ActivityIconTag';
import { CardFooter } from './card-footer.component';
import { CardHeaderTitle } from './card-header-title.component';
import { CardHeader } from './card-header.component';
import { Clickable } from './clickable.component';
import { UserAvatar } from 'components/avatar/avatar.component';
import { ExpandableParagraph } from 'components/expandable-paragraph/expandable-paragraph.component';
import { ClipboardIcon } from 'components/icons';
import { PreventInheritedLinkClicks } from 'components/prevent-inherited-link-clicks/prevent-inherited-link-clicks.component';
import { tokenCssVars } from 'config/theme';
import { useIsConnectedProfile } from 'contexts/current-user.context';
import { useThemeMode } from 'contexts/theme-manager.context';
import { useUnvouchModal } from 'contexts/unvouch-modal.context';
import { parseVouchMetadata } from 'hooks/api/blockchain-manager/metadata.utils';
import { type BulkVotes } from 'types/activity';
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
  hideComments?: boolean;
  inlineClipboardIcon?: boolean;
  truncateContent?: boolean;
  shadowed?: boolean;
  isClickable?: boolean;
};

type Vouch = Props['info']['data'];
type ActivityType = Props['info']['type'];

function VouchAmount({ vouch, type }: { vouch: Vouch; type: ActivityType }) {
  return (
    <ActivityIconTag hasPadding>
      <Tooltip title={`${type === vouchActivity ? 'Vouch' : 'Unvouch'} amount`}>
        <Title
          delete={type === unvouchActivity}
          level={5}
          css={css`
            font-weight: bold;
            letter-spacing: 0.0375rem;
            color: ${tokenCssVars.colorPrimary};
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
  truncateContent,
}: {
  vouch: Vouch;
  description?: string;
  type: ActivityType;
  truncateContent: boolean;
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
    return <ExpandableParagraph enabled={truncateContent}>{description}</ExpandableParagraph>;
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
  hideComments,
  inlineClipboardIcon,
  truncateContent = true,
  shadowed,
  isClickable = true,
}: Props) {
  const copyToClipboard = useCopyToClipboard();
  const { token } = theme.useToken();
  const { data: vouch, author, subject, votes, replySummary, events, type } = info;
  const { openUnvouchModal } = useUnvouchModal();

  const isCurrentUser = useIsConnectedProfile(vouch.authorProfileId);

  const vouchTitle = truncateTitle(vouch.comment);
  const { description, source } = parseVouchMetadata(vouch?.metadata);
  const txnHash = getVouchTxnUrl(vouch.archived && type === unvouchActivity, events);
  const isAiAgent = Boolean(source?.toLowerCase().includes('openai'));

  async function copyShareUrl() {
    await copyToClipboard(getActivityUrl(info, true), 'Link successfully copied');
  }

  const mode = useThemeMode();
  const customShadow =
    mode === 'light'
      ? 'drop-shadow(0px 4px 9px rgba(0, 0, 0, 0.06)) drop-shadow(0px 17px 17px rgba(0, 0, 0, 0.05)) drop-shadow(0px 37px 22px rgba(0, 0, 0, 0.03)) drop-shadow(0px 66px 26px rgba(0, 0, 0, 0.01)) drop-shadow(0px 103px 29px rgba(0, 0, 0, 0))'
      : 'drop-shadow(0px 27px 36.4px rgba(0, 0, 0, 0.35))';

  return (
    <Clickable link={isClickable ? getActivityUrl(info) : undefined}>
      <Flex
        css={css`
          background-color: ${tokenCssVars.colorBgContainer};
          border-radius: ${token.borderRadius}px;

          ${shadowed
            ? css`
                filter: ${customShadow};
              `
            : null}
        `}
        justify="stretch"
        vertical
      >
        <CardHeader
          title={
            <>
              <CardHeaderTitle
                author={author}
                subject={subject}
                type={type}
                isAiAgent={isAiAgent}
              />
              {inlineClipboardIcon ? (
                <PreventInheritedLinkClicks>
                  <Tooltip title="Copy link">
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
          <PreventInheritedLinkClicks>
            <UserAvatar actor={author} size="large" />
          </PreventInheritedLinkClicks>
          <Flex vertical flex={1}>
            <Flex justify="space-between" gap={18} align="flex-start">
              <Paragraph>
                <Title delete={type === unvouchActivity} level={4}>
                  &ldquo;{vouchTitle}&rdquo;
                </Title>
              </Paragraph>
              {!hideVouchAmount ? <VouchAmount vouch={vouch} type={type} /> : null}
            </Flex>
            <VouchDescription
              vouch={vouch}
              description={description}
              type={type}
              truncateContent={truncateContent}
            />
            <PreventInheritedLinkClicks>
              {!hideFooter ? (
                <CardFooter
                  targetId={vouch.id}
                  targetContract={vouchContractName}
                  votes={votes}
                  replySummary={replySummary}
                  currentVote={userVotes?.[vouchContractName]?.[vouch.id]?.userVote ?? null}
                  pathname={getActivityUrl(info)}
                  hideComments={hideComments}
                />
              ) : null}
            </PreventInheritedLinkClicks>
          </Flex>
        </Flex>
      </Flex>
    </Clickable>
  );
}
