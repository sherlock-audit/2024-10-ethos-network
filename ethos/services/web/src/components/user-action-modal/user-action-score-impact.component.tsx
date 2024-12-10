import { css } from '@emotion/react';
import { ScoreImpact, type ActivityActor } from '@ethos/domain';
import { Flex, theme, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { UserAvatar } from 'components/avatar/avatar.component';
import { PersonName } from 'components/person-name/person-name.component';
import { ScoreDifference } from 'components/score-difference/score-difference.component';
import { tokenCssVars } from 'config/theme';

type ProvisionalScoreImpactType = {
  impact: ScoreImpact;
  value: number;
};

type UserScoreImpactProps = {
  provisionalScoreImpact?: ProvisionalScoreImpactType | null;
  isLoading?: boolean;
  targetActor: ActivityActor;
};

const ANIMATION_DURATION = 0.4;
const defaultScoreImpact = {
  value: 0,
  impact: ScoreImpact.NEUTRAL,
};

export function UserActionScoreImpact({
  provisionalScoreImpact,
  targetActor,
  isLoading = false,
}: UserScoreImpactProps) {
  const { token } = theme.useToken();
  const [scoreImpactState, setScoreImpactState] =
    useState<ProvisionalScoreImpactType>(defaultScoreImpact);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (provisionalScoreImpact) {
      setScoreImpactState(provisionalScoreImpact);
      setIsExpanded(true);
      setTimeout(
        () => {
          setIsContentVisible(true);
        },
        ANIMATION_DURATION * 1000 * 0.7,
      );
    } else {
      setIsContentVisible(false);
      setIsExpanded(false);
      setTimeout(() => {
        setScoreImpactState(defaultScoreImpact);
      }, ANIMATION_DURATION * 1000);
    }
  }, [provisionalScoreImpact, isLoading]);

  const scoreImpacted = scoreImpactState.value !== 0;

  return (
    <Flex
      justify="space-between"
      align="center"
      css={css`
        width: 100%;
        background-color: ${tokenCssVars.colorBgBase};
        overflow: hidden;
        height: ${isExpanded ? '35px' : '0px'};
        transition: height ${ANIMATION_DURATION}s ease-in-out;
        padding: 0 ${token.paddingMD}px;
      `}
    >
      <Flex
        gap={token.marginXS}
        align="center"
        css={css`
          opacity: ${isContentVisible ? 1 : 0};
          transition: opacity ${ANIMATION_DURATION}s ease-in-out;
        `}
      >
        <UserAvatar size="small" actor={targetActor} />
        <Typography.Text type="secondary">
          {scoreImpacted ? 'Impact to ' : 'No impact to '}
          <PersonName target={targetActor} color="colorTextSecondary" ellipsis maxWidth="170px" />
          &apos;s credibility score
        </Typography.Text>
      </Flex>
      {scoreImpacted && (
        <div
          css={css`
            background-color: ${tokenCssVars.colorBgContainer};
            border-radius: 3px;
            padding: 0 ${token.paddingXXS}px;
            opacity: ${isContentVisible ? 1 : 0};
            transition: opacity ${ANIMATION_DURATION}s ease-in-out;
          `}
        >
          <ScoreDifference
            score={scoreImpactState.value}
            isLoading={isLoading}
            impact={scoreImpactState.impact}
            animationDelay={ANIMATION_DURATION}
          />
        </div>
      )}
    </Flex>
  );
}
