import { readFileSync } from 'node:fs';
import path from 'node:path';
import { type ImageResponse } from 'next/og';

type Fonts = NonNullable<NonNullable<ConstructorParameters<typeof ImageResponse>[1]>['fonts']>;

const interFontRegular = readFileSync(path.resolve('./public/assets/fonts/Inter-Regular.ttf'));
const interFontSemiBold = readFileSync(path.resolve('./public/assets/fonts/Inter-SemiBold.ttf'));
const interFontBold = readFileSync(path.resolve('./public/assets/fonts/Inter-Bold.ttf'));
const queensFontRegular = readFileSync(path.resolve('./public/assets/fonts/Queens-Regular.ttf'));
const queensFontBold = readFileSync(path.resolve('./public/assets/fonts/Queens-Bold.ttf'));

export function getFonts(): Fonts {
  return [
    {
      name: 'Inter',
      weight: 400,
      style: 'normal',
      data: interFontRegular,
    },
    {
      name: 'Inter',
      weight: 600,
      style: 'normal',
      data: interFontSemiBold,
    },
    {
      name: 'Inter',
      weight: 700,
      style: 'normal',
      data: interFontBold,
    },
    {
      name: 'Queens',
      weight: 400,
      style: 'normal',
      data: queensFontRegular,
    },
    {
      name: 'Queens',
      weight: 600,
      style: 'normal',
      data: queensFontBold,
    },
  ];
}
