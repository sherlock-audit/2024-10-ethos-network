import { convertScoreToLevel, type ScoreLevel } from '@ethos/score';

export function getColorBgClassFromScoreLevel(scoreLevel: ScoreLevel): string {
  // TODO: Resolve from theme config when it's dynamic.
  const scoreColorMap: Record<ScoreLevel, string> = {
    untrusted: 'bg-antd-colorError',
    questionable: 'bg-antd-colorWarning',
    neutral: 'bg-antd-colorTextBase',
    reputable: 'bg-antd-colorPrimary',
    exemplary: 'bg-antd-colorSuccess',
  };

  return scoreColorMap[scoreLevel];
}

export function getTextColorClassFromScoreLevel(scoreLevel: ScoreLevel): string {
  // TODO: Resolve from theme config when it's dynamic.
  const scoreColorMap: Record<ScoreLevel, string> = {
    untrusted: 'text-antd-colorError',
    questionable: 'text-antd-colorWarning',
    neutral: 'text-antd-colorTextBase',
    reputable: 'text-antd-colorPrimary',
    exemplary: 'text-antd-colorSuccess',
  };

  return scoreColorMap[scoreLevel];
}

export function getColorBgClassFromScore(score: number): string {
  return getColorBgClassFromScoreLevel(convertScoreToLevel(score));
}

export function getTextColorClassFromScore(score: number): string {
  return getTextColorClassFromScoreLevel(convertScoreToLevel(score));
}
