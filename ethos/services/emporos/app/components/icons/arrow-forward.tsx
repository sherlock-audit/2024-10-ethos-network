import Icon, { type CustomIconComponentProps } from './icon.tsx';

export function ArrowForwardSvg() {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 14 14"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M3.566 11.802 4.6 12.835 10.432 7 4.6 1.168 3.566 2.2l4.801 4.801-4.8 4.801Z" />
    </svg>
  );
}

export function ArrowForwardIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={ArrowForwardSvg} {...props} />;
}
