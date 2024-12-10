import Icon, { type CustomIconComponentProps } from './icon.tsx';

function InfoSvg() {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 14 14"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M6.416 4.085h1.167V5.25H6.416V4.085Zm0 2.333h1.167v3.5H6.416v-3.5Zm.583-5.25a5.835 5.835 0 0 0-5.833 5.833 5.835 5.835 0 0 0 5.833 5.834A5.835 5.835 0 0 0 12.833 7a5.836 5.836 0 0 0-5.834-5.833Zm0 10.5a4.673 4.673 0 0 1-4.666-4.667 4.673 4.673 0 0 1 4.666-4.666A4.673 4.673 0 0 1 11.666 7a4.673 4.673 0 0 1-4.667 4.667Z" />
    </svg>
  );
}

export function InfoIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={InfoSvg} {...props} />;
}
