import { css } from '@emotion/react';
import { Button, Flex, theme, Tooltip, Typography } from 'antd';
import {
  ArrowDown,
  ArrowUp,
  DislikeFilled,
  LikeDislike,
  LikeFilled,
  UncertainIcon,
} from 'components/icons';
import { tokenCssVars } from 'config';

export function FeedbackActions({
  onThumbsUp,
  onThumbsDown,
  onNeutral,
  onNotSure,
  variant = 'emoji',
}: {
  onThumbsUp: () => void;
  onThumbsDown: () => void;
  onNeutral: () => void;
  onNotSure: () => void;
  variant?: 'emoji' | 'arrows' | 'text';
}) {
  const { token } = theme.useToken();
  const { positiveIcon, negativeIcon } = getFeedbackActionsIcons(variant);

  return (
    <Flex gap={token.marginXL} align="center">
      <Tooltip title="No">
        <Button
          shape="circle"
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
          onClick={onThumbsDown}
          type="text"
        />
      </Tooltip>
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
          <Button
            shape="circle"
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
            onClick={onNeutral}
            type="text"
          />
        </Tooltip>
        <Tooltip title="I don't know this person">
          <Button
            shape="circle"
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
            aria-label="I don't know this person"
            onClick={onNotSure}
            type="text"
          />
        </Tooltip>
      </Flex>
      <Tooltip title="Yes">
        <Button
          shape="circle"
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
          onClick={onThumbsUp}
          type="text"
        />
      </Tooltip>
    </Flex>
  );
}

function getFeedbackActionsIcons(variant: 'emoji' | 'arrows' | 'text') {
  if (variant === 'emoji') {
    return {
      positiveIcon: <LikeFilled css={{ fontSize: 40 }} />,
      negativeIcon: <DislikeFilled css={{ fontSize: 40 }} />,
    };
  }

  if (variant === 'arrows') {
    return {
      positiveIcon: <ArrowUp css={{ fontSize: 40 }} />,
      negativeIcon: <ArrowDown css={{ fontSize: 40 }} />,
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
        height: 44,
        width: 44,
        color:
          type === 'positive' ? tokenCssVars.colorSuccessActive : tokenCssVars.colorErrorActive,
      }}
    >
      <Typography.Text
        css={{
          fontSize: 14,
          color: 'inherit',
        }}
      >
        It&apos;s too
      </Typography.Text>
      <Typography.Text
        css={{
          fontSize: 16,
          fontWeight: 700,
          color: 'inherit',
        }}
      >
        {type === 'positive' ? 'LOW' : 'HIGH'}
      </Typography.Text>
    </Flex>
  );
}
