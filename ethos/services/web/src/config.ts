import { echoUrlMap, webUrlMap, type EthosEnvironment } from '@ethos/env';
import { theme, type ThemeConfig } from 'antd';
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';

export const INTERCOM_APP_ID = 'xccbut8m';

export const themes = ['light', 'dark'] as const;

export type Theme = (typeof themes)[number];

const inter = Inter({
  variable: '--font-inter',
  weight: ['400', '600', '800'],
  style: ['normal'],
  subsets: ['latin'],
  display: 'swap',
});

const queens = localFont({
  variable: '--font-queens',
  display: 'swap',
  src: [
    {
      path: '../public/assets/fonts/Queens_W-Bold.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../public/assets/fonts/Queens_W-Bold.woff',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../public/assets/fonts/Queens-Bold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../public/assets/fonts/Queens_W-Regular.woff',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/assets/fonts/Queens_W-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/assets/fonts/Queens-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/assets/fonts/Queens_W-Thin.woff2',
      weight: '100',
      style: 'normal',
    },
    {
      path: '../public/assets/fonts/Queens_W-Thin.woff',
      weight: '100',
      style: 'normal',
    },
    {
      path: '../public/assets/fonts/Queens-Thin.ttf',
      weight: '100',
      style: 'normal',
    },
  ],
});

export const fonts = {
  inter,
  queens,
};

export const darkTheme = {
  cssVar: true,
  hashed: false,
  algorithm: typeof window === 'undefined' ? [] : [theme.defaultAlgorithm],
  token: {
    colorPrimary: '#2E7BC3',
    colorPrimaryBgHover: '#1F21B61A',
    colorPrimaryBg: '#1F21B61A',
    colorInfo: '#1b69b1',
    colorTextBase: '#EFEEE0',
    colorText: '#EFEEE0D9',
    colorTextSecondary: '#FFFFFFA6',
    colorTextTertiary: '#FFFFFF73',
    colorBgBase: '#232320',
    colorBgLayout: '#232320',
    colorBorder: '#9E9C8D00',
    colorBorderSecondary: '#B3B2A500',
    colorWarningBg: '#222830',
    colorWarningBorder: '#FFE58F00',
    colorWarningTextActive: '#D48806',
    colorBgElevated: '#333330',
    colorErrorBg: '#B72B3826',
    colorErrorBgHover: '#422D2B',
    colorSuccessBgHover: '#29392A',
    colorErrorBorder: '#FFCCC700',
    colorPrimaryBorder: '#8F97DB00',
    colorSuccessBorder: '#B7EB8F00',
    colorBorderBg: '#1F212640',
    colorError: '#b72b38',
    colorWarning: '#C29010',
    wireframe: false,
    colorSuccess: '#127f31',
    colorSuccessBg: '#29392A',
    colorInfoBg: '#222830',
    colorInfoBorder: '#162e4300',
    colorLink: '#8D8D85',
    colorLinkHover: '#8D8D85BF',
    colorBgContainer: '#2d2d2A',
    colorFillSecondary: '#44443F',
    colorBgMask: '#23232040',
    fontFamily: inter.style.fontFamily,
    lineHeight: 1.25,
    padding: 18,
    paddingXL: 40,
    borderRadiusLG: 8,
  },
  components: {
    Button: {
      defaultActiveColor: '#F9F9F9',
      defaultHoverColor: '#F1F1F1',
      groupBorderColor: '#4096FF00',
      primaryShadow: 'none',
      defaultShadow: 'none',
      dangerShadow: 'none',
      defaultBorderColor: '#D9D9D900',
      colorTextLightSolid: '#232320',
      dangerColor: '#ffffff',
    },
    Avatar: {
      containerSizeSM: 20,
      containerSize: 40,
      containerSizeLG: 64,
    },
    Anchor: {
      fontSize: 12,
      fontSizeLG: 14,
    },
    Dropdown: {
      paddingBlock: 11,
      fontSizeIcon: 14,
    },
    Layout: {
      headerBg: '#232320',
      lightSiderBg: '#2D2D29',
      lightTriggerBg: '#2D2D29',
      lightTriggerColor: '#2D2D29',
      bodyBg: '#232320',
      footerBg: '#2D2D29',
      colorText: '#1F2126',
      headerColor: '#C1C0B6',
    },
    Mentions: {
      colorBgContainer: '#232320',
      colorErrorBg: '#232320',
      colorWarningBg: '#232320',
    },
    Menu: {
      itemBg: '#232320',
      darkItemBg: '#C1C0B6',
      itemHoverColor: '#2E7BC3BF',
      horizontalItemSelectedColor: '#2E7BC3',
      activeBarHeight: 0,
      motionDurationMid: '0s',
      motionDurationSlow: '0s',
    },
    Modal: {
      colorBgMask: '#00000073',
    },
    Typography: {
      titleMarginBottom: 0,
      titleMarginTop: 0,
      fontSize: 12,
      fontSizeLG: 14,
      colorTextDescription: '#FFFFFFA6',
      lineHeightHeading5: 1,
    },
    Select: {
      optionSelectedBg: '#12121212',
      colorBgContainer: '#232320',
    },
    Statistic: {
      padding: 24,
    },
    Alert: {
      colorErrorBg: '#383832',
      colorWarningBg: '#383832',
      colorSuccessBg: '#383832',
      colorInfoBg: '#383832',
      fontSize: 12,
    },
    Table: {
      headerSplitColor: '#232320A0',
      headerBg: '#23232030',
      colorLink: '#1B69B1',
      colorLinkHover: '#2373BE',
      colorLinkActive: '#2E89DE',
      colorPrimary: '#1B69B1',
      borderColor: '#232320A0',
      cellPaddingBlock: 16,
    },
    Input: {
      colorBgContainer: '#2D2D29',
      colorTextPlaceholder: '#C1C0B6A6',
    },
    InputNumber: {
      colorBgContainer: '#232320',
    },
    DatePicker: {
      colorBgContainer: '#232320',
    },
    Cascader: {
      colorBgContainer: '#232320',
    },
    Pagination: {
      colorBgContainer: '#232320',
    },
    Tooltip: {
      colorTextLightSolid: '#FFFFFF',
      colorBgSpotlight: '#424242',
      fontSize: 12,
      lineHeight: 1.75,
    },
    Notification: {
      colorBgElevated: '#333330',
    },
    Checkbox: {
      colorBgContainer: '#333330',
    },
    Card: {
      paddingLG: 18,
    },
  },
} as const satisfies ThemeConfig;

export const lightTheme = {
  cssVar: true,
  hashed: false,
  algorithm: typeof window === 'undefined' ? [] : [theme.defaultAlgorithm],
  token: {
    colorPrimary: '#1F21B6',
    colorPrimaryBgHover: '#1F21B614',
    colorInfo: '#1f21b6',
    colorTextBase: '#1F2126',
    colorText: '#1F2126E0',
    colorTextSecondary: '#1F2126A6',
    colorTextTertiary: '#1F212673',
    colorLink: '#343539',
    colorLinkHover: '#343539BF',
    colorBgBase: '#C1C0B6',
    colorBgContainer: '#CBCBC2',
    colorBorder: '#9E9C8D00',
    colorBorderSecondary: '#B3B2A500',
    colorPrimaryBg: '#1F21B61A',
    colorBgLayout: '#C1C0B6',
    colorWarningBg: '#D5D4CD',
    colorWarningBorder: '#FFE58F00',
    colorWarningTextActive: '#D48806',
    colorBgElevated: '#D5D4CD',
    colorErrorBg: '#CF132226',
    colorErrorBorder: '#FFCCC700',
    colorPrimaryBorder: '#8F97DB00',
    colorSuccessBg: '#AFC0AC',
    colorSuccessBorder: '#B7EB8F00',
    colorBorderBg: '#1F212640',
    colorSuccessBgHover: '#AFC0AC',
    colorErrorBgHover: '#CCAFAA',
    colorFillSecondary: '#C1C1B9',
    colorSuccess: '#127f31',
    colorError: '#b72b38',
    colorWarning: '#cc9a1a',
    colorBgMask: '#23232040',
    wireframe: false,
    fontFamily: inter.style.fontFamily,
    lineHeight: 1.25,
    padding: 18,
    paddingXL: 40,
    borderRadiusLG: 8,
  },
  components: {
    Button: {
      defaultBg: '#C1C0B6',
      defaultBorderColor: '#D9D9D900',
      defaultActiveBorderColor: '#0958D900',
      defaultColor: '#010101',
      defaultActiveColor: '#494949',
      defaultHoverColor: '#414141',
      defaultHoverBorderColor: '#414141',
      groupBorderColor: '#4096FF00',
      primaryShadow: 'none',
      defaultShadow: 'none',
      dangerShadow: 'none',
      colorTextLightSolid: '#C1C0B6',
      dangerColor: '#ffffff',
    },
    Avatar: {
      containerSizeSM: 20,
      containerSize: 40,
      containerSizeLG: 64,
    },
    Anchor: {
      fontSize: 12,
      fontSizeLG: 14,
    },
    Dropdown: {
      paddingBlock: 11,
      fontSizeIcon: 14,
    },
    Layout: {
      headerBg: '#C1C0B6',
      lightSiderBg: '#C1C0B6',
      lightTriggerBg: '#C1C0B6',
      lightTriggerColor: '#C1C0B6',
      footerBg: '#C1C0B6',
      colorText: '#1F2126',
      headerColor: '#C1C0B6',
      algorithm: true,
      bodyBg: '#C1C0B6',
    },
    Mentions: {
      colorBgContainer: '#C1C0B6',
    },
    Modal: {
      colorBgMask: '#00000073',
    },
    InputNumber: {
      colorBgContainer: '#C1C0B6',
    },
    Input: {
      colorBgContainer: '#cbcbc2', // lower case fixed the issue for search 🤷‍♂️, maybe value case change triggered update??
      colorTextPlaceholder: '#1F212673',
    },
    Select: {
      colorBgContainer: '#C1C0B6',
    },
    Statistic: {
      colorTextDescription: '#1F2126A6',
      colorTextHeading: '#1F2126E0',
      padding: 24,
    },
    Table: {
      headerSplitColor: '#1F21260F',
      headerBg: '#1F212605',
      borderColor: '#1F21260F',
      cellPaddingBlock: 16,
    },
    Menu: {
      itemBg: '#C1C0B6',
      itemHoverColor: '#1F21B6BF',
      itemSelectedColor: '#1F21B6',
      activeBarHeight: 0,
      motionDurationMid: '0s',
      motionDurationSlow: '0s',
    },
    Typography: {
      titleMarginBottom: 0,
      titleMarginTop: 0,
      fontSize: 12,
      fontSizeLG: 14,
      colorTextDescription: '#1F2126A6',
      lineHeightHeading5: 1,
    },
    Alert: {
      colorInfoBg: '#D5D4CD',
      colorInfoBorder: '#8F97DB00',
      fontSize: 12,
    },
    Pagination: {
      colorBgContainer: '#C1C0B6',
    },
    DatePicker: {
      colorBgContainer: '#C1C0B6',
    },
    Tooltip: {
      colorBgSpotlight: '#000000',
      fontSize: 12,
      lineHeight: 1.75,
      colorTextLightSolid: '#C1C0B6',
    },
    Notification: {
      colorBgElevated: '#D5D4CD',
    },
    Checkbox: {
      colorBgContainer: '#C1C0B6',
    },
    Card: {
      paddingLG: 18,
    },
  },
} as const satisfies ThemeConfig;

export const tokenCssVars = {
  // TEXT
  buttonDangerColor: 'var(--ant-button-danger-color)',
  colorTextBase: 'var(--ant-color-text-base)',
  colorText: 'var(--ant-color-text)',
  colorTextLightSolid: 'var(--ant-color-text-light-solid)',
  colorIconHover: 'var(--ant-color-icon-hover)',
  colorPrimary: 'var(--ant-color-primary)',
  colorPrimaryHover: 'var(--ant-color-primary-hover)',
  colorPrimaryBgHover: 'var(--ant-color-primary-bg-hover)',
  colorPrimaryText: 'var(--ant-color-primary-text)',
  colorPrimaryTextActive: 'var(--ant-color-primary-text-active)',
  colorTextSecondary: 'var(--ant-color-text-secondary)',
  colorFillSecondary: 'var(--ant-color-fill-secondary)',
  colorTextDescription: 'var(--ant-color-text-description)',
  colorLink: 'var(--ant-color-link)',
  colorLinkHover: 'var(--ant-color-link-hover)',
  colorInfo: 'var(--ant-color-info)',
  colorFill: 'var(--ant-color-fill)',
  colorTextTertiary: 'var(--ant-color-text-tertiary)',
  colorTextQuaternary: 'var(--ant-color-text-quaternary)',
  colorSuccess: 'var(--ant-color-success)',
  colorSuccessHover: 'var(--ant-color-success-hover)',
  colorSuccessTextHover: 'var(--ant-color-success-text-hover)',
  colorSuccessBorderHover: 'var(--ant-color-success-border-hover)',
  colorSuccessBorder: 'var(--ant-color-success-border)',
  colorSuccessBg: 'var(--ant-color-success-bg)',
  colorSuccessBgHover: 'var(--ant-color-success-bg-hover)',
  colorSuccessActive: 'var(--ant-color-success-active)',
  colorError: 'var(--ant-color-error)',
  colorErrorActive: 'var(--ant-color-error-active)',
  colorErrorBgHover: 'var(--ant-color-error-bg-hover)',
  colorErrorTextActive: 'var(--ant-color-error-text-active)',
  colorWarning: 'var(--ant-color-warning)',
  colorWarningTextActive: 'var(--ant-color-warning-text-active)',
  colorTextDisabled: 'var(--ant-color-text-disabled)',
  cyan7: 'var(--ant-cyan-7)',
  colorFillAlter: 'var(--ant-color-fill-alter)',
  colorBorder: 'var(--ant-color-border)',
  colorBorderSecondary: 'var(--ant-color-border-secondary)',
  colorBorderBg: 'var(--ant-color-border-bg)',

  // BG
  colorBgBase: 'var(--ant-color-bg-base)',
  colorBgLayout: 'var(--ant-color-bg-layout)',
  colorBgElevated: 'var(--ant-color-bg-elevated)',
  colorBgContainer: 'var(--ant-color-bg-container)',
  colorBgMask: 'var(--ant-color-bg-mask)',
  colorBgSpotlight: 'var(--ant-color-bg-spotlight)',
  colorLayoutHeaderBg: 'var(--ant-layout-header-bg)',

  // Box-shadow
  boxShadow: 'var(--ant-box-shadow)',
  boxShadowSecondary: 'var(--ant-box-shadow-secondary)',
  boxShadowTertiary: 'var(--ant-box-shadow-tertiary)',
  boxShadowCard: 'var(--ant-box-shadow-card)',
};

export type TokenCssVarKey = keyof typeof tokenCssVars;

export function getEnvironment(): EthosEnvironment {
  if (
    process.env.NODE_ENV === 'development' ||
    (typeof window !== 'undefined' && window.location.hostname === 'localhost')
  ) {
    return 'local';
  }

  // This is a static way to get the environment. It's set as a runtime variable
  // but depending from where the function is called, it might not be available.
  if (process.env.NEXT_PUBLIC_ETHOS_ENV) {
    return process.env.NEXT_PUBLIC_ETHOS_ENV as EthosEnvironment;
  }

  if (typeof window !== 'undefined' && window.location.origin === webUrlMap.dev) {
    return 'dev';
  }

  if (typeof window !== 'undefined' && window.location.origin === webUrlMap.testnet) {
    return 'testnet';
  }

  if (typeof window !== 'undefined' && window.location.origin === webUrlMap.prod) {
    return 'prod';
  }

  throw new Error('Unknown environment');
}

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

export function getPWAIconPath(size: '96x96' | '192x192' | '512x512') {
  const environment = getEnvironment();

  switch (environment) {
    case 'local':
      return `/assets/images/pwa/icon-local-${size}.png`;
    case 'dev':
      return `/assets/images/pwa/icon-dev-${size}.png`;
    default:
      return `/assets/images/pwa/icon-${size}.png`;
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
