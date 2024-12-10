import { type EthosUserTarget } from '@ethos/domain';
import { convertScoreToLevel, scoreRanges } from '@ethos/score';
import { SVG_HEIGHT, SVG_OPACITY, SVG_WIDTH } from './constants';
import { getScoreGraphArea } from './get-score-graph-area';
import { echoApi } from 'services/echo';
import { getColorFromScoreLevelSSR } from 'utils/score';

function getSvgDataUrl(svgString: string) {
  // Convert the SVG string to a base64 encoded string
  const base64Svg = Buffer.from(svgString).toString('base64');

  // Create a data URL
  const dataUrl = `data:image/svg+xml;base64,${base64Svg}`;

  return dataUrl;
}

export async function getScoreGraphSSR(target: EthosUserTarget, scoreOverride: number) {
  const scoreHistory = await echoApi.scores.history(target);

  const scoreLevel = convertScoreToLevel(
    scoreOverride || (scoreHistory?.values[0]?.score ?? scoreRanges.neutral.min),
  );

  const scoreColor = getColorFromScoreLevelSSR(scoreLevel);

  if (scoreHistory && scoreHistory.values.length > 0) {
    const area = getScoreGraphArea(scoreHistory);
    const svg = `
      <svg width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <path d="${area}" fill="${scoreColor}" opacity="${SVG_OPACITY}" />
      </svg>
    `;

    const dataUrl = getSvgDataUrl(svg);

    return dataUrl;
  }

  return null;
}
