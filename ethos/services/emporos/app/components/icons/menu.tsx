import Icon, { type CustomIconComponentProps } from './icon.tsx';

function MenuSvg() {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M2.5 15.5h15v-1.667h-15V15.5Zm0-4.167h15V9.667h-15v1.666Zm0-5.833v1.667h15V5.5h-15Z" />
    </svg>
  );
}

export function MenuIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={MenuSvg} {...props} />;
}
