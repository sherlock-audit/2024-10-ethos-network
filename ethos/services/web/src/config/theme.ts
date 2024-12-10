import {
  baseDarkTheme,
  baseLightTheme,
  type EthosTheme,
  getDarkTheme,
  getLightTheme,
  tokenCssVarsBase,
  type TokenCssVarsBaseKey,
} from '@ethos/common-ui';
import { fonts } from './fonts';

export const darkTheme = baseDarkTheme;
export const lightTheme = baseLightTheme;

export function getTheme(mode: EthosTheme) {
  return mode === 'dark'
    ? getDarkTheme(fonts.inter.style.fontFamily)
    : getLightTheme(fonts.inter.style.fontFamily);
}

export const tokenCssVars = tokenCssVarsBase;
export type TokenCssVarKey = TokenCssVarsBaseKey;
