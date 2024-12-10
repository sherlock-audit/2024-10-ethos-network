import { Inter } from 'next/font/google';
import localFont from 'next/font/local';

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
      path: '../../public/assets/fonts/QueensVar.woff',
    },
    {
      path: '../../public/assets/fonts/QueensVar.woff2',
    },
  ],
});

export const fonts = {
  inter,
  queens,
};
