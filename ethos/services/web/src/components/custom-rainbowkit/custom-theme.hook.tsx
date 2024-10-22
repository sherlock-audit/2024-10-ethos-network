import { darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { theme } from 'antd';
import { merge } from 'lodash-es';
import { type PartialDeep } from 'type-fest';
import { useThemeMode } from 'contexts/theme-manager.context';

type RainbowKitTheme = PartialDeep<ReturnType<typeof lightTheme>>;

export function useCustomRainbowKitTheme() {
  const mode = useThemeMode();
  const { token } = theme.useToken();

  /**
   * Override the default RainbowKit theme.
   * @warning Do not use tokenCssVars here. CSS variables can be undefined in rainbowkit context.
   */
  const override: RainbowKitTheme = {
    colors: {
      accentColor: token.colorPrimary,
      modalBackground: token.colorBgElevated,
      menuItemBackground: token.colorBgBase,
      modalText: token.colorText,
      modalTextDim: token.colorText,
      modalTextSecondary: token.colorText,
    },
    shadows: {
      connectButton: '',
      dialog: '',
    },
    fonts: {
      body: 'var(--font-inter), sans-serif',
    },
    radii: {
      actionButton: '8px',
      connectButton: '8px',
      menuButton: '8px',
      modal: '8px',
      modalMobile: '8px',
    },
  };

  return merge(mode === 'dark' ? darkTheme() : lightTheme(), override);
}
