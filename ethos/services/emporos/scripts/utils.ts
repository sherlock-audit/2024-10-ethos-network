import { baseLightTheme, baseDarkTheme } from '@ethos/common-ui';

import { theme } from 'antd';

/**
 * Patterns for valid color values.
 */
export const COLOR_PATTERNS = [
  /^#([A-Fa-f0-9]{3}){1,2}$/, // hex colors: #fff or #ffffff
  /^#([A-Fa-f0-9]{4}){1,2}$/, // hex colors with alpha: #fff8 or #ffffff88
  /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/, // rgb colors
  /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/, // rgba colors
  /^hsl\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?\s*\)$/, // hsl colors
  /^hsla\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?\s*,\s*[\d.]+\s*\)$/, // hsla colors
];

/**
 * Checks if the value is a valid color.
 */
export function isValidColor(value: string): boolean {
  if (typeof value !== 'string') return false;

  return COLOR_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * Checks if the key is valid for CSS variables.
 * It skips keys that follow the pattern 'color' + number (without hyphen such as blue2)
 * Because we are already generating the hyphenated version such as blue-2
 */
export function isValidKey(key: string): boolean {
  // Because we are already generating the hyphenated version such as blue-2
  return !/^[a-z]+\d+$/.test(key);
}

/**
 * Gets the full list of Ant Design colors.
 * The colors provided in our theme will override the default ones.
 */
export const lightToken = theme.getDesignToken({
  ...baseLightTheme,
  // baseLightTheme has empty algorithm array in build step
  algorithm: [theme.defaultAlgorithm],
});

/**
 * Gets the full list of Ant Design colors for dark theme.
 */
export const darkToken = theme.getDesignToken({
  ...baseDarkTheme,
  // baseDarkTheme has empty algorithm array in build step
  algorithm: [theme.defaultAlgorithm],
});
