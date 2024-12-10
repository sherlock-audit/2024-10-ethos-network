import { getDarkTheme, getLightTheme, tokenCssVarsBase } from '@ethos/common-ui';
import { type ThemeConfig } from 'antd';

const baseDarkTheme = getDarkTheme('Inter, sans-serif');
const baseLightTheme = getLightTheme('Inter, sans-serif');

export const tokenCssVars = tokenCssVarsBase;

export const darkTheme: ThemeConfig = {
  ...baseDarkTheme,
  cssVar: { key: 'antd-dark' },
  // If there is only one version of antd in your application, you can set `false` to reduce the bundle size
  hashed: false,
  components: {
    ...baseDarkTheme.components,
    Button: {
      ...baseDarkTheme.components.Button,
      defaultBg: baseDarkTheme.token.colorBgBase,
      defaultHoverBg: baseDarkTheme.token.colorBgElevated,
      defaultHoverBorderColor: baseDarkTheme.token.colorBgBase,
    },
  },
};

export const lightTheme: ThemeConfig = {
  ...baseLightTheme,
  cssVar: { key: 'antd-light' },
  // If there is only one version of antd in your application, you can set `false` to reduce the bundle size
  hashed: false,
  components: {
    ...baseLightTheme.components,
    Button: {
      ...baseLightTheme.components.Button,
      defaultBg: baseLightTheme.token.colorBgBase,
      defaultHoverBg: baseLightTheme.token.colorBgElevated,
      defaultHoverBorderColor: baseLightTheme.token.colorBgBase,
    },
  },
};
