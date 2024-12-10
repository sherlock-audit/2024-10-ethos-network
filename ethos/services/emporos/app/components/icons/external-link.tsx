import Icon, { type CustomIconComponentProps } from './icon.tsx';

export function ExternalLinkSvg() {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 12 12"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M9.5 9.5h-7v-7H6v-1H2.5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7c.55 0 1-.45 1-1V6h-1v3.5ZM7 1.5v1h1.795L3.88 7.415l.705.705L9.5 3.205V5h1V1.5H7Z" />
    </svg>
  );
}

export function ExternalLinkIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={ExternalLinkSvg} {...props} />;
}
