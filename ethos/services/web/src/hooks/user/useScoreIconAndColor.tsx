import { type Review } from '@ethos/blockchain-manager';
import { type ReactNode, useMemo } from 'react';
import { LikeDislike, DislikeFilled, LikeFilled } from 'components/icons';
import { tokenCssVars } from 'config';

export const useScoreIconAndColor = (fontSize = 18) => {
  const COLOR_BY_SCORE: Record<Review['score'], string> = useMemo(
    () => ({
      negative: tokenCssVars.colorError,
      neutral: tokenCssVars.colorIconHover,
      positive: tokenCssVars.colorSuccess,
    }),
    [],
  );

  const ICON_BY_SCORE: Record<Review['score'], ReactNode> = useMemo(
    () => ({
      negative: <DislikeFilled css={{ color: COLOR_BY_SCORE.negative, fontSize }} />,
      neutral: <LikeDislike css={{ color: COLOR_BY_SCORE.neutral, fontSize }} />,
      positive: <LikeFilled css={{ color: COLOR_BY_SCORE.positive, fontSize }} />,
    }),
    [fontSize, COLOR_BY_SCORE],
  );

  return { ICON_BY_SCORE, COLOR_BY_SCORE };
};
