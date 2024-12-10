import { type Config } from 'tailwindcss';
import safeArea from 'tailwindcss-safe-area';
import { generateTailwindColors } from './scripts/generate-tw-colors.ts';

const generatedColors = generateTailwindColors();

export default {
  content: ['./app/**/{**,.client,.server}/**/*.{ts,tsx}'],
  corePlugins: {
    preflight: false,
  },
  important: true,
  // Custom selector to make dark: variant be in sync with our theme
  darkMode: ['selector', '.dark'],
  theme: {
    extend: {
      colors: {
        borderDark: 'var(--borderDark)',
        borderSecondary: 'var(--borderSecondary)',
        trust: 'var(--colorTrust)',
        distrust: 'var(--colorDistrust)',
        trustBg: 'var(--colorTrustBg)',
        distrustBg: 'var(--colorDistrustBg)',
        // TODO: remove 2 colors below after updating vaul drawer component
        'colorText-light': '#C1C0B6D9',
        'colorIcon-light': '#C1C0B673',
        ...generatedColors,
      },
      fontFamily: {
        queens: ['Queens', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        plex: ['IBM Plex Sans', 'sans-serif'],
      },
      fontSize: {
        xxs: '10px',
      },
      boxShadow: {
        mobileFooter: '0px 4px 36.4px 0px rgba(0, 0, 0, 0.35)',
        floatButton: '0px 0px 15px 0px rgba(0, 0, 0, 0.25)',
      },
      screens: {
        xs: '400px',
      },
      borderRadius: {
        50: '50px',
        100: '100px',
      },
    },
  },
  plugins: [safeArea],
} satisfies Config;
