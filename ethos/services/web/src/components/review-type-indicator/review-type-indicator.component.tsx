import { type Review } from '@ethos/blockchain-manager';
import { Tooltip } from 'antd';
import { upperFirst } from 'lodash-es';
import { ActivityIconTag } from 'components/activity-cards/ActivityIconTag';
import { TooltipIconWrapper } from 'components/tooltip/tooltip-icon-wrapper';
import { useScoreIconAndColor } from 'hooks/user/useScoreIconAndColor';

type ReviewTypeIndicatorProps = { scoreType: Review['score'] };

export function ReviewTypeIndicator({ scoreType }: ReviewTypeIndicatorProps) {
  const { ICON_BY_SCORE } = useScoreIconAndColor();

  return (
    <ActivityIconTag>
      <Tooltip title={`${upperFirst(scoreType)} review`}>
        <TooltipIconWrapper>{ICON_BY_SCORE[scoreType]}</TooltipIconWrapper>
      </Tooltip>
    </ActivityIconTag>
  );
}
