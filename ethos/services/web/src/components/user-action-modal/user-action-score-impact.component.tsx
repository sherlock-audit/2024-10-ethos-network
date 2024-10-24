import { css } from '@emotion/react';
import { type ScoreImpact, type ActivityActor } from '@ethos/domain';
import { Flex, theme, Typography } from 'antd';
import { UserAvatar } from 'components/avatar/avatar.component';
import { ScoreDifference } from 'components/score-difference/score-difference.component';
import { tokenCssVars } from 'config';

type UserScoreImpactProps = {
  provisionalScoreImpact: {
    impact: ScoreImpact;
    value: number;
  };
  isLoading?: boolean;
  targetActor: ActivityActor;
};

export function UserActionScoreImpact({
  provisionalScoreImpact,
  targetActor,
  isLoading = false,
}: UserScoreImpactProps) {
  const { token } = theme.useToken();

  return (
    <Flex
      justify="space-between"
      align="center"
      css={css`
        width: 100%;
        background-color: ${tokenCssVars.colorBgBase};
        padding: ${token.paddingXS}px ${token.paddingMD}px;
      `}
    >
      <Flex gap={token.marginXS} align="center">
        <UserAvatar size="small" actor={targetActor} />
        <Typography.Text type="secondary">
          <Typography.Text
            type="secondary"
            ellipsis={true}
            css={css`
              max-width: 170px;
            `}
          >
            {targetActor.name}
          </Typography.Text>
          &apos;s score will be affected
        </Typography.Text>
      </Flex>
      <div
        css={css`
          background-color: ${tokenCssVars.colorBgContainer};
          border-radius: 3px;
          padding: 0 ${token.paddingXXS}px;
        `}
      >
        <ScoreDifference
          score={provisionalScoreImpact.value}
          impact={provisionalScoreImpact.impact}
          isLoading={isLoading}
        />
      </div>
    </Flex>
  );
}
