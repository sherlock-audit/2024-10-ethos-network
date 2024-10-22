import { type ScoreLevel } from '@ethos/score';
import { type AliasToken } from 'antd/es/theme/internal';
import { lightTheme, type TokenCssVarKey, tokenCssVars } from 'config';

export function getTokenColor(
  token: Partial<AliasToken>,
  colorName: keyof Partial<AliasToken>,
  withCssVar: boolean = true,
): string {
  const cssVarColor = colorName in tokenCssVars ? tokenCssVars[colorName as TokenCssVarKey] : '';

  // token[colorName] is always a string in our case but AliasToken is typed to allow other types
  const hexColor =
    typeof token[colorName] === 'string'
      ? token[colorName]
      : typeof token.colorTextBase === 'string'
        ? token.colorTextBase
        : '';

  if (cssVarColor.startsWith('var') && withCssVar) {
    return cssVarColor.replace(')', `, ${hexColor})`);
  }

  return hexColor;
}

export function getColorFromScoreLevel(
  scoreLevel: ScoreLevel,
  token: Partial<AliasToken>,
  withCssVar: boolean = true,
): string {
  const scoreColorMap: Record<ScoreLevel, string> = {
    untrusted: getTokenColor(token, 'colorError', withCssVar),
    questionable: getTokenColor(token, 'colorWarning', withCssVar),
    neutral: getTokenColor(token, 'colorTextBase', withCssVar),
    reputable: getTokenColor(token, 'colorPrimary', withCssVar),
    exemplary: getTokenColor(token, 'colorSuccess', withCssVar),
  };

  return scoreColorMap[scoreLevel];
}

export function getColorFromScoreLevelSSR(score: ScoreLevel) {
  return getColorFromScoreLevel(score, lightTheme.token, false);
}
