import { css } from '@emotion/react';
import {
  NegativeReview,
  NeutralReview,
  PositiveReview,
  type Review,
} from '@ethos/blockchain-manager';
import { reviewContractName } from '@ethos/contracts';
import { type ReviewActivityInfo } from '@ethos/domain';
import { Button, Flex, theme, Tooltip, Typography } from 'antd';
import { type BaseType } from 'antd/es/typography/Base';
import Link from 'next/link';
import { CardFooter } from './card-footer.component';
import { CardHeaderTitle } from './card-header-title.component';
import { CardHeader } from './card-header.component';
import { UserAvatar } from 'components/avatar/avatar.component';
import { ExpandableParagraph } from 'components/expandable-paragraph/expandable-paragraph.component';
import { ClipboardIcon } from 'components/icons';
import { PreventInheritedLinkClicks } from 'components/prevent-inherited-link-clicks/prevent-inherited-link-clicks.component';
import { ReviewTypeIndicator } from 'components/review-type-indicator/review-type-indicator.component';
import { tokenCssVars } from 'config';
import { useArchiveReview } from 'hooks/api/blockchain-manager';
import { parseReviewMetadata } from 'hooks/api/blockchain-manager/metadata.utils';
import { useScoreIconAndColor } from 'hooks/user/useScoreIconAndColor';
import { useIsCurrentTargetUser } from 'hooks/user/utils';
import { type BulkVotes } from 'types/activity';
import { useCopyToClipboard } from 'utils/clipboard';
import { getActivityUrl } from 'utils/routing';
import { truncateTitle } from 'utils/truncate-title';

const { Title, Paragraph } = Typography;

export const TEXT_PROPS_REVIEW_BY_SCORE: Record<Review['score'], { text: string; type: BaseType }> =
  {
    negative: {
      text: NegativeReview,
      type: 'danger',
    },
    neutral: {
      text: NeutralReview,
      type: 'warning',
    },
    positive: {
      text: PositiveReview,
      type: 'success',
    },
  };

type Props = {
  info: ReviewActivityInfo;
  userVotes?: BulkVotes;
  hideFooter?: boolean;
  hideReviewTypeIndicator?: boolean;
  hideActions?: boolean; // TODO: Discuss topic: Do we prefer props for hiding or showing that defaults to true
  hideTimestamp?: boolean;
  inlineClipboardIcon?: boolean;
  shadowed?: boolean;
};

export function ReviewCard({
  info,
  userVotes,
  hideFooter,
  hideReviewTypeIndicator,
  hideActions,
  hideTimestamp,
  inlineClipboardIcon,
  shadowed,
}: Props) {
  const copyToClipboard = useCopyToClipboard();

  const { data: review, author, subject, votes, replySummary, events } = info;

  const { token } = theme.useToken();
  const isCurrentUser = useIsCurrentTargetUser({ address: review.author });
  const reviewTitle = truncateTitle(review.comment);
  const { description } = parseReviewMetadata(review?.metadata);

  const archiveReview = useArchiveReview();

  const { COLOR_BY_SCORE } = useScoreIconAndColor();

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
              <CardHeaderTitle
                author={author}
                subject={subject}
                type="review"
                score={review.score}
                color={COLOR_BY_SCORE[review.score]}
              />
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
          <UserAvatar size="large" actor={author} />
          <Flex vertical flex={1}>
            <Flex justify="space-between" gap={18} align="flex-start">
              <Paragraph>
                <Title level={4}>&ldquo;{reviewTitle}&rdquo;</Title>
              </Paragraph>
              {!hideReviewTypeIndicator ? <ReviewTypeIndicator scoreType={review.score} /> : null}
            </Flex>
            {description ? <ExpandableParagraph>{description}</ExpandableParagraph> : null}
            <PreventInheritedLinkClicks>
              {!hideFooter ? (
                <CardFooter
                  targetId={review.id}
                  targetContract={reviewContractName}
                  votes={votes}
                  replySummary={replySummary}
                  pathname={getActivityUrl(info)}
                  currentVote={userVotes?.[reviewContractName]?.[review.id]?.userVote ?? null}
                />
              ) : null}
            </PreventInheritedLinkClicks>
          </Flex>
        </Flex>
      </Flex>
    </Link>
  );
}
