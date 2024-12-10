import { echoUrlMap, webUrlMap } from '@ethos/env';
import { getEnvironment } from 'config/environment';

export const INTERCOM_APP_ID = 'xccbut8m';

export function getFaviconPath() {
  const environment = getEnvironment();

  switch (environment) {
    case 'local':
      return '/favicon-local.svg';
    case 'dev':
      return '/favicon-dev.svg';
    default:
      return '/favicon.svg';
  }
}

export function getPWAIconPath(size: '96x96' | '192x192' | '512x512', isMaskable = false) {
  const environment = getEnvironment();

  const path = '/assets/images/pwa';
  const iconName = isMaskable ? 'icon-maskable' : 'icon';

  switch (environment) {
    case 'local':
      return `${path}/${iconName}-local-${size}.png`;
    case 'dev':
      return `${path}/${iconName}-dev-${size}.png`;
    default:
      return `${path}/${iconName}-${size}.png`;
  }
}

export function getAppleTouchIconPath(size: '57x57' | '180x180') {
  const environment = getEnvironment();

  switch (environment) {
    case 'local':
      return `/assets/images/apple-touch/apple-touch-icon-local-${size}.png`;
    case 'dev':
      return `/assets/images/apple-touch/apple-touch-icon-dev-${size}.png`;
    default:
      return `/assets/images/apple-touch/apple-touch-icon-${size}.png`;
  }
}

export function getWebServerUrl() {
  return webUrlMap[getEnvironment()];
}

export function getEchoBaseUrl() {
  // Preferably use this variable if it's set. But depending on from where this
  // function is called, it might not be available.
  if (process.env.NEXT_PUBLIC_ECHO_BASE_URL) {
    return process.env.NEXT_PUBLIC_ECHO_BASE_URL;
  }

  return echoUrlMap[getEnvironment()];
}

export function getAppVersion() {
  return process.env.NEXT_PUBLIC_VERSION ?? 'local';
}

export const STATSIG_CLIENT_API_KEY = (() => {
  const env = getEnvironment();

  switch (env) {
    case 'local':
      return 'client-ckQWSPuRq6wThkz3YcHCspl6ngAcI5zPz93hNXhQxti';
    case 'dev':
      return 'client-DDQNXHYd2OciUPUIPAmTzYo8CysQkXfStZIA2NYEK9p';
    case 'testnet':
      return 'client-hrdf36I7BvNmNiqwn95gC4RZBEQfiq4RjR7hKMHtckM';
    case 'prod':
      return 'client-OBNK8P7vPkrPUDLaHuO7J2dkMbFdeQau8d2mqqYpGim';
    default:
      throw new Error('Unknown environment');
  }
})();

export function getStatsigEnvironment() {
  const env = getEnvironment();

  switch (env) {
    case 'local':
    case 'dev':
      return 'development';
    case 'testnet':
      return 'staging';
    case 'prod':
      return 'production';
    default:
      throw new Error('Unknown environment');
  }
}

export function getAmplitudeApiKey() {
  const env = getEnvironment();

  switch (env) {
    case 'local':
    case 'dev':
      return 'd8e9e6064066bfd2405cfce189c578c6';
    case 'testnet':
      return 'f6f6063f44eccdc9fbc75e9e988309ac';
    case 'prod':
      return 'a7b5cd1d85ac80efe2590b9bdd0366d3';
    default:
      throw new Error('Unknown environment');
  }
}
