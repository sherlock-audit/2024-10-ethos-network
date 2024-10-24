import { type ExtentionSVGProps } from './types';

export function VouchFilledSvg(props: ExtentionSVGProps = {}) {
  const { color = 'currentColor', width = '1em', height = '1em', className = '' } = props;

  return `
    <svg
      class="${className}"
      width="${width}"
      height="${height}"
      fill="${color}"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 60 60"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 6.773v36.775L29.913 60h.174L60 43.548V6.773a59.67 59.67 0 0 1-12 5.28V0H36v14.504a60.726 60.726 0 0 1-12 0V0H12v12.053a59.67 5.67 0 0 1-12-5.28Zm12 5.28a59.713 59.713 0 0 0 12 2.45V32h12V14.504a59.713 59.713 0 0 0 12-2.451v24.4l-18 9.9-18-9.9v-24.4Z"
      />
    </svg>
    `;
}
