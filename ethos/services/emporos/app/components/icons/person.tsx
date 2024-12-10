import Icon, { type CustomIconComponentProps } from './icon.tsx';

function Svg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      fill="currentColor"
      viewBox="0 0 10 10"
    >
      <path d="M5 5A2.333 2.333 0 1 0 5 .334 2.333 2.333 0 0 0 5 5Zm0 1.166C3.442 6.166.333 6.948.333 8.5v.583c0 .32.263.583.584.583h8.166c.321 0 .584-.262.584-.583V8.5c0-1.552-3.11-2.334-4.667-2.334Z" />
    </svg>
  );
}

export function PersonIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={Svg} {...props} />;
}
