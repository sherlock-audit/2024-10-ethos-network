import Icon, { type CustomIconComponentProps } from './icon.tsx';

export function UpNorthSvg() {
  return (
    <svg
      width="15"
      height="14"
      viewBox="0 0 15 14"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="m3.674 5.251.822.823 2.678-2.672v9.433H8.34V3.402l2.677 2.678.822-.829-4.083-4.083-4.083 4.083Z" />
    </svg>
  );
}

export function UpNorthIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={UpNorthSvg} {...props} />;
}
