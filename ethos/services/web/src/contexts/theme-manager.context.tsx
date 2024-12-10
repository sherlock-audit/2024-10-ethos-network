'use client';

import { type EthosTheme, themes } from '@ethos/common-ui';
import { createContext, useContext, useState } from 'react';
import { setThemeToCookies } from './theme-action';

const DEFAULT_THEME: EthosTheme = 'light';

type ThemeManagerContextType = {
  theme: EthosTheme;
  setTheme: (theme: EthosTheme) => void;
};

const ThemeManagerContext = createContext<ThemeManagerContextType>({
  theme: DEFAULT_THEME,
  setTheme: () => null,
});

function getDefaultBrowserTheme(): EthosTheme | null {
  if (typeof window === 'undefined') return null;

  const theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  setThemeToCookies(theme);

  return theme;
}

export const ThemeManagerConsumer = ThemeManagerContext.Consumer;

export function ThemeManagerProvider({
  children,
  userTheme,
}: React.PropsWithChildren<{ userTheme?: string }>) {
  const [theme, setTheme] = useState<EthosTheme>(
    isValidTheme(userTheme) ? userTheme : (getDefaultBrowserTheme() ?? DEFAULT_THEME),
  );

  function handleSetTheme(theme: EthosTheme) {
    setTheme(theme);
    setThemeToCookies(theme);
  }

  return (
    <ThemeManagerContext.Provider value={{ theme, setTheme: handleSetTheme }}>
      {children}
    </ThemeManagerContext.Provider>
  );
}

/**
 * Hook to access the current theme and theme setter function.
 *
 * @remarks
 * You MUST destructure and rename the 'theme' property when using this hook,
 * as 'theme' is a reserved word in some contexts.
 * This is why we don't export it, and instead offer `useThemeMode` as an alternative.
 *
 * @example
 * ```tsx
 * const { theme: mode, setTheme } = useThemeManager();
 * ```
 *
 * @throws {Error} If used outside of a ThemeManagerProvider
 * @returns {ThemeManagerContextType} The current theme and setter function
 */
function useThemeManager() {
  const context = useContext(ThemeManagerContext);

  if (!context) {
    throw new Error('useThemeManager must be used within a ThemeManagerProvider');
  }

  return context;
}

function isValidTheme(theme?: string): theme is EthosTheme {
  return Boolean(theme) && themes.some((t) => t === theme);
}

/**
 * Hook to access the current theme mode.
 *
 * @remarks
 * Use this hook instead of loading the theme directly from context or cookies.
 * We had an issue where `theme` was a reserved word.
 *
 * @returns The current theme mode.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const mode = useThemeMode();
 *   const backgroundImage = `/assets/images/score/background${mode === 'dark' ? '-dark' : ''}.svg`;
 * }
 * ```
 */
export function useThemeMode() {
  const context = useThemeManager();

  return context.theme;
}

/**
 * Hook to access the theme setter function.
 */
export function useThemeSetter() {
  const context = useThemeManager();

  return context.setTheme;
}
