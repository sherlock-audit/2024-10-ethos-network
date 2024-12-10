import { css } from '@emotion/react';
import { useCopyToClipboard } from '@ethos/common-ui';
import { reviewContractName } from '@ethos/contracts';
import { type ReviewActivityInfo } from '@ethos/domain';
import { Button, Flex, theme, Tooltip, Typography } from 'antd';
import { CardFooter } from './card-footer.component';
import { CardHeaderTitle } from './card-header-title.component';
import { CardHeader } from './card-header.component';
import { Clickable } from './clickable.component';
import { UserAvatar } from 'components/avatar/avatar.component';
import { ExpandableParagraph } from 'components/expandable-paragraph/expandable-paragraph.component';
import { ClipboardIcon } from 'components/icons';
import { PreventInheritedLinkClicks } from 'components/prevent-inherited-link-clicks/prevent-inherited-link-clicks.component';
import { ReviewTypeIndicator } from 'components/review-type-indicator/review-type-indicator.component';
import { tokenCssVars } from 'config/theme';
import { useIsTargetCurrentUser } from 'contexts/current-user.context';
import { useThemeMode } from 'contexts/theme-manager.context';
import { useArchiveReview } from 'hooks/api/blockchain-manager';
import { parseReviewMetadata } from 'hooks/api/blockchain-manager/metadata.utils';
import { useScoreIconAndColor } from 'hooks/user/useScoreIconAndColor';
import { type BulkVotes } from 'types/activity';
import { getActivityUrl } from 'utils/routing';
import { truncateTitle } from 'utils/truncate-title';

const { Title, Paragraph } = Typography;

type Props = {
  info: ReviewActivityInfo;
  userVotes?: BulkVotes;
  hideFooter?: boolean;
  hideReviewTypeIndicator?: boolean;
  hideActions?: boolean; // TODO: Discuss topic: Do we prefer props for hiding or showing that defaults to true
  hideTimestamp?: boolean;
  hideComments?: boolean;
  inlineClipboardIcon?: boolean;
  truncateContent?: boolean;
  shadowed?: boolean;
  isClickable?: boolean;
};

export function ReviewCard({
  info,
  userVotes,
  hideFooter,
  hideReviewTypeIndicator,
  hideActions,
  hideTimestamp,
  hideComments,
  inlineClipboardIcon,
  truncateContent = true,
  shadowed,
  isClickable = true,
}: Props) {
  const copyToClipboard = useCopyToClipboard();

  const { data: review, author, subject, votes, replySummary, events } = info;

  const { token } = theme.useToken();
  const isCurrentUser = useIsTargetCurrentUser({ address: review.author });
  const reviewTitle = truncateTitle(review.comment);
  const { description, source } = parseReviewMetadata(review?.metadata);
  const isAiAgent = Boolean(source?.toLowerCase().includes('agent-'));

  const archiveReview = useArchiveReview();

  const { COLOR_BY_SCORE } = useScoreIconAndColor();

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
                type="review"
                score={review.score}
                color={COLOR_BY_SCORE[review.score]}
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
          timestamp={review.createdAt}
          txnHash={events.at(0)?.txHash}
          onWithdraw={
            isCurrentUser
              ? async () => {
                  try {
                    await archiveReview.mutateAsync(review.id);
                  } catch (error) {
                    console.error('Failed to archive review', error);
                  }
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
            <UserAvatar size="large" actor={author} />
          </PreventInheritedLinkClicks>
          <Flex vertical flex={1}>
            <Flex justify="space-between" gap={18} align="flex-start">
              <Paragraph>
                <Title level={4}>&ldquo;{reviewTitle}&rdquo;</Title>
              </Paragraph>
              {!hideReviewTypeIndicator ? <ReviewTypeIndicator scoreType={review.score} /> : null}
            </Flex>
            {description ? (
              <ExpandableParagraph enabled={truncateContent}>{description}</ExpandableParagraph>
            ) : null}
            <PreventInheritedLinkClicks>
              {!hideFooter ? (
                <CardFooter
                  targetId={review.id}
                  targetContract={reviewContractName}
                  votes={votes}
                  replySummary={replySummary}
                  pathname={getActivityUrl(info)}
                  currentVote={userVotes?.[reviewContractName]?.[review.id]?.userVote ?? null}
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
