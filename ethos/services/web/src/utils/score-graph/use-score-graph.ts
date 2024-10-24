import { type EthosUserTarget } from '@ethos/domain';
import { convertScoreToLevel, scoreRanges } from '@ethos/score';
import { theme } from 'antd';
import { useEffect, useState } from 'react';
import { getScoreGraphArea } from './get-score-graph-area';
import { fallbackScoreGraph, getSvgElement, svg2Blob } from './utils';
import { useScoreHistory } from 'hooks/user/lookup';
import { getColorFromScoreLevel } from 'utils/score';

export function useScoreGraph(target: EthosUserTarget, scoreOverride: number = 0) {
  const { token } = theme.useToken();

  const { data: scoreHistory } = useScoreHistory(target);

  const [url, setUrl] = useState<string | null>(null);

  const scoreLevel = convertScoreToLevel(
    scoreOverride || (scoreHistory?.at(0)?.score ?? scoreRanges.neutral.min),
  );

  /**
   * Maps score levels to their corresponding colors.
   * @warning Do not use tokenCssVars here. CSS variables are undefined in SVGs stored in object URLs.
   */

  const scoreColor = getColorFromScoreLevel(scoreLevel, token);

  useEffect(() => {
    if (scoreHistory && scoreHistory.length > 0) {
      const area = getScoreGraphArea(scoreHistory);
      const svgElement = getSvgElement(area, scoreColor);

      if (svgElement) {
        const data = svg2Blob(svgElement);
        const objectUrl = URL.createObjectURL(data);
        setUrl(objectUrl);

        return () => {
          URL.revokeObjectURL(objectUrl);
          setUrl(null);
        };
      }
    }

    return () => {};
  }, [scoreHistory, scoreLevel, scoreColor]);

  return url ?? fallbackScoreGraph(scoreColor);
}
