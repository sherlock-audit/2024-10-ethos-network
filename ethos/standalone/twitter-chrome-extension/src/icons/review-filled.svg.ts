import { type ExtentionSVGProps } from './types';

export function ReviewFilledSvg(props: ExtentionSVGProps = {}) {
  const { color = 'currentColor', width = '1em', height = '1em', className = '' } = props;

  return `
    <svg
      class="${className}"
      width="${width}"
      height="${height}"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 63 63"
    >
      <path fill="${color}" d="M2 9.936h15.12v15.12H2zM32.24 9.936h15.12v15.12H32.24V9.935Z" />
      <path
        d="M24.68 25.059A22.68 22.68 0 0 1 2 47.739M54.92 25.059a22.68 22.68 0 0 1-22.68 22.68"
        stroke="${color}"
        stroke-width="15.12"
      />
    </svg>
`;
}
