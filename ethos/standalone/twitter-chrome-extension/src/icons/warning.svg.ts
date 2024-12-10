import { type ExtentionSVGProps } from './types';

export function WarningSvg(props: ExtentionSVGProps = {}) {
  const { color = '#cc9a1a', width = '1em', height = '1em', className } = props;

  return `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="${width}"
      height="${height}"
      fill="${color}"
      viewBox="0 0 17 15"
      class="${className}"
    >
      <path d="m8.25 2.993 5.648 9.757H2.602L8.25 2.992ZM8.25 0 0 14.25h16.5L8.25 0ZM9 10.5H7.5V12H9v-1.5ZM9 6H7.5v3H9V6Z" />
    </svg>
  `;
}
