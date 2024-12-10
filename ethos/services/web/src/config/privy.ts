import { css, type SerializedStyles } from '@emotion/react';
import { type EthosTheme } from '@ethos/common-ui';
import { type PrivyClientConfig } from '@privy-io/react-auth';
import { baseSepolia } from 'viem/chains';
import { getEnvironment } from './environment';
import { getWebServerUrl } from './misc';
import { darkTheme, lightTheme } from './theme';
import { privacyPolicyLink, termsOfServiceLink } from 'constant/links';
import { useThemeMode } from 'contexts/theme-manager.context';

export function usePrivyConfig(): PrivyClientConfig {
  const theme = useThemeMode();

  return {
    appearance: {
      accentColor: theme === 'dark' ? darkTheme.token.colorPrimary : lightTheme.token.colorPrimary,
      loginMessage: 'Welcome to Ethos. Please use your social connections from Ethos to login.',
      logo: getLogo(theme),
      theme,
    },
    legal: {
      privacyPolicyUrl: privacyPolicyLink,
      termsAndConditionsUrl: termsOfServiceLink,
    },
    supportedChains: [baseSepolia],
  };
}

function getLogo(theme: EthosTheme) {
  const webUrl = getWebServerUrl();
  const env = getEnvironment();

  return new URL(
    `/assets/images/privy/logo-${theme === 'dark' ? env : 'all'}-${theme}.png`,
    webUrl,
  ).toString();
}

/**
 * Get the CSS variables override for the Privy UI
 * Docs: https://docs.privy.io/guide/react/configuration/appearance#css-overrides
 */
export function usePrivyCssVarOverride(): SerializedStyles {
  const theme = useThemeMode();
  // Token CSS variables don't work here
  const token = theme === 'dark' ? darkTheme.token : lightTheme.token;

  return css`
    :root {
      --privy-color-background: ${token.colorBgElevated} !important;
      --privy-color-background-2: ${token.colorBgContainer} !important;
      --privy-color-foreground: ${token.colorText} !important;
      --privy-color-foreground-3: ${token.colorTextSecondary} !important;
      --privy-color-foreground-4: ${token.colorBgContainer} !important;
      --privy-color-success: ${token.colorSuccess} !important;
      --privy-color-error: ${token.colorError} !important;
      --privy-color-error-light: ${token.colorErrorBgHover} !important;
      --privy-color-warn: ${token.colorWarning} !important;
      --privy-color-warn-light: ${token.colorBgContainer} !important;
    }
  `;
}
