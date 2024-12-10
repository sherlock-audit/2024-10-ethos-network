import { tokenCssVars } from '~/config/theme.ts';
import { type tailwindTheme } from '~/theme/tailwindTheme.tsx';

function percentToScoreCategory(percent: number): 'high' | 'medium' | 'low' {
  if (percent >= 70) {
    return 'high';
  }
  if (percent > 30) {
    return 'medium';
  }

  return 'low';
}

export function percentToAntdCssVar(
  percent: number,
): (typeof tailwindTheme.colors)[keyof typeof tailwindTheme.colors] {
  switch (percentToScoreCategory(percent)) {
    case 'high':
      return tokenCssVars.colorSuccess;
    case 'medium':
      return tokenCssVars.colorWarning;
    case 'low':
      return tokenCssVars.colorError;
  }
}

export function percentToTailwindBgClass(percent: number): `bg-${string}` {
  switch (percentToScoreCategory(percent)) {
    case 'high':
      return 'bg-antd-colorSuccess';
    case 'medium':
      return 'bg-antd-colorWarning';
    case 'low':
      return 'bg-antd-colorError';
  }
}

export function percentToTailwindTextClass(percent: number): `text-${string}` {
  switch (percentToScoreCategory(percent)) {
    case 'high':
      return 'text-antd-colorSuccess';
    case 'medium':
      return 'text-antd-colorWarning';
    case 'low':
      return 'text-antd-colorError';
  }
}
