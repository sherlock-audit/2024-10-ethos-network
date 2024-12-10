import { css } from '@emotion/react';
import { type CONTRIBUTION_ANSWER_TYPES } from '@ethos/domain';
import { Button, Flex, theme, Tooltip, Typography } from 'antd';
import {
  type OnContribute,
  useRecordContributionWithMsg,
} from '../hooks/useRecordContributionWithMsg';
import {
  ArrowDown,
  ArrowUp,
  DislikeFilled,
  LikeDislike,
  LikeFilled,
  UncertainIcon,
} from 'components/icons';
import { TooltipIconWrapper } from 'components/tooltip/tooltip-icon-wrapper';
import { tokenCssVars } from 'config/theme';

type VariantProps =
  | {
      variant: 'emoji' | 'arrows' | 'text';
      contributionType: 'SCORE_CHECK' | 'REVIEW_CHECK' | 'TRUST_CHECK';
    }
  | {
      variant: 'vote';
      contributionType: 'REVIEW_VOTE';
      onVote: (isUpvote: boolean) => Promise<void>;
      onSkip: () => void;
    };

type Props = {
  contributionId: number;
  onContribute: OnContribute;
} & VariantProps;

export function FeedbackActions(props: Props) {
  const { variant, contributionId, contributionType, onContribute } = props;
  const { token } = theme.useToken();
  const { positiveIcon, negativeIcon } = getFeedbackActionsIcons(variant);
  const { recordAction, isPending } = useRecordContributionWithMsg({ onContribute });

  async function onAnswer(answer: (typeof CONTRIBUTION_ANSWER_TYPES)[number]) {
    if (variant === 'vote') {
      const { onVote } = props;
      await onVote(answer === 'POSITIVE');
    } else {
      await recordAction({
        contributionId,
        action: { type: contributionType, answer },
      });
    }
  }

  return (
    <Flex
      vertical
      gap={token.margin}
      align="center"
      css={css`
        margin-bottom: 10px;
      `}
    >
      <Flex gap={token.marginXL} align="center">
        <Tooltip title={variant === 'text' ? 'Their score is too high' : 'No'}>
          <Button
            shape="circle"
            loading={isPending}
            css={{
              width: 85,
              height: 85,
              color: tokenCssVars.colorError,
              backgroundColor: tokenCssVars.colorBgLayout,
              '&:hover': {
                opacity: 0.7,
              },
            }}
            icon={negativeIcon}
            aria-label="No"
            onClick={async () => {
              await onAnswer('NEGATIVE');
            }}
            type="text"
          />
        </Tooltip>
        {variant !== 'vote' && (
          <Flex
            vertical
            gap={token.margin}
            align="center"
            css={css`
              @media (max-height: 800px) {
                gap: 8px;
              }
            `}
          >
            <Tooltip title="Neutral">
              <TooltipIconWrapper>
                <Button
                  shape="circle"
                  loading={isPending}
                  css={{
                    width: 'auto',
                    height: 'auto',
                    padding: 8,
                    color: tokenCssVars.colorTextSecondary,
                    backgroundColor: tokenCssVars.colorBgLayout,
                    '&:hover': {
                      opacity: 0.7,
                    },
                  }}
                  icon={<LikeDislike css={{ fontSize: 25 }} />}
                  aria-label="Neutral"
                  onClick={async () => {
                    await onAnswer('NEUTRAL');
                  }}
                  type="text"
                />
              </TooltipIconWrapper>
            </Tooltip>
            <Tooltip title="I'm not sure">
              <TooltipIconWrapper>
                <Button
                  shape="circle"
                  loading={isPending}
                  css={{
                    width: 'auto',
                    height: 'auto',
                    padding: 8,
                    color: tokenCssVars.colorTextSecondary,
                    backgroundColor: tokenCssVars.colorBgLayout,
                    '&:hover': {
                      opacity: 0.7,
                    },
                  }}
                  icon={<UncertainIcon css={{ fontSize: 25 }} />}
                  aria-label="I'm not sure"
                  onClick={async () => {
                    await onAnswer('UNSURE');
                  }}
                  type="text"
                />
              </TooltipIconWrapper>
            </Tooltip>
          </Flex>
        )}
        <Tooltip title={variant === 'text' ? 'Their score is too low' : 'Yes'}>
          <Button
            shape="circle"
            loading={isPending}
            css={{
              width: 85,
              height: 85,
              color: tokenCssVars.colorSuccess,
              backgroundColor: tokenCssVars.colorBgLayout,
              '&:hover': {
                opacity: 0.7,
              },
            }}
            icon={positiveIcon}
            aria-label="Yes"
            onClick={async () => {
              await onAnswer('POSITIVE');
            }}
            type="text"
          />
        </Tooltip>
      </Flex>
      {variant === 'vote' && (
        <Button type="link" onClick={props.onSkip}>
          Skip & continue
        </Button>
      )}
    </Flex>
  );
}

function getFeedbackActionsIcons(variant: 'emoji' | 'arrows' | 'text' | 'vote') {
  if (variant === 'emoji') {
    return {
      positiveIcon: <LikeFilled css={{ fontSize: 32 }} />,
      negativeIcon: <DislikeFilled css={{ fontSize: 32 }} />,
    };
  }

  if (variant === 'arrows' || variant === 'vote') {
    return {
      positiveIcon: <ArrowUp css={{ fontSize: 32 }} />,
      negativeIcon: <ArrowDown css={{ fontSize: 32 }} />,
    };
  }

  return {
    positiveIcon: <ScoreText type="positive" />,
    negativeIcon: <ScoreText type="negative" />,
  };
}

export function ScoreText({ type }: { type: 'positive' | 'negative' }) {
  return (
    <Flex
      vertical
      align="center"
      justify="space-between"
      css={{
        width: 44,
        color: type === 'positive' ? tokenCssVars.colorSuccess : tokenCssVars.colorError,
      }}
    >
      <Typography.Text
        css={{
          fontSize: 14,
          color: type === 'positive' ? tokenCssVars.colorSuccess : tokenCssVars.colorError,
        }}
      >
        {type === 'positive' ? 'Underrated' : 'Overrated'}
      </Typography.Text>
    </Flex>
  );
}
