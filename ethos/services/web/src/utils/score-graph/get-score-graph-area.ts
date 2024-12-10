import * as d3 from 'd3';
import { BREATHING_ROOM_FACTOR, SVG_HEIGHT, SVG_WIDTH } from './constants';
import { type useScoreHistory } from 'hooks/user/lookup';
import { type ExtractUseQueryResult } from 'types/query-result.util';

type ScoreHistoryResponse = ExtractUseQueryResult<typeof useScoreHistory>;

export function getScoreGraphArea(scoreHistory: ScoreHistoryResponse) {
  // pad score history to current date
  const paddedHistory = [
    { score: scoreHistory.values[0].score, createdAt: new Date() },
    ...scoreHistory.values,
  ];

  const maxTime = paddedHistory.at(0)?.createdAt ?? new Date();
  const minTime = paddedHistory.at(-1)?.createdAt ?? new Date();
  const data: Array<[Date, number]> = paddedHistory.map((x) => [x.createdAt, x.score]);

  const { minScore, maxScore } = paddedHistory.reduce(
    (value, current) => {
      value.minScore = Math.min(current.score, value.minScore);
      value.maxScore = Math.max(current.score, value.maxScore);

      return value;
    },
    {
      minScore: Number.POSITIVE_INFINITY,
      maxScore: Number.NEGATIVE_INFINITY,
    },
  );

  // time on x-axis, scaled from oldest to newest
  const scaleX = d3.scaleTime().domain([minTime, maxTime]).range([0, SVG_WIDTH]);
  // score on y-axis, inverse scale to begin on bottom
  const scaleY = d3
    .scaleLinear()
    .domain([minScore / BREATHING_ROOM_FACTOR, maxScore * BREATHING_ROOM_FACTOR])
    .range([SVG_HEIGHT, 0]);

  const area = d3
    .area<[Date, number]>()
    .x(([x, _]) => scaleX(x))
    .y0((_) => scaleY(0))
    .y1(([_, y]) => scaleY(y))
    .curve(d3.curveMonotoneX);

  return area(data);
}
