import resolveConfig from 'tailwindcss/resolveConfig';
import tailwindConfig from '~/../tailwind.config.ts';

const { theme } = resolveConfig(tailwindConfig);

export const tailwindTheme = theme;
