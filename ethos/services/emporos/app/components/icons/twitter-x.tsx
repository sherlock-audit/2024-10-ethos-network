import Icon, { type CustomIconComponentProps } from './icon.tsx';

export function TwitterXSvg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <path d="m9.412 6.811 4.22-4.803h-1l-3.665 4.17-2.926-4.17H2.666l4.425 6.306-4.425 5.037h1l3.868-4.405 3.09 4.405H14M4.026 2.746h1.536l7.07 9.903h-1.537" />
    </svg>
  );
}

export function TwitterXIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={TwitterXSvg} {...props} />;
}
