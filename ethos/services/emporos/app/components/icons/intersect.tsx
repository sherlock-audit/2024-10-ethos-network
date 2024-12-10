import Icon, { type CustomIconComponentProps } from './icon.tsx';

function IntersectSvg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 28 28"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M22.398 12.347a22.5 22.5 0 0 1-5.336 1.396V28h-5.6V13.8A22.51 22.51 0 0 1 5.6 12.326V0H0v9.081-9.08L28 0v9.122l-.002.001V0h-5.6v12.347Zm-8.372 1.597c-.867 0-1.722-.048-2.564-.143V0h5.6v13.743c-.993.133-2.006.201-3.036.201Z"
      />
      <path d="M22.398 28V12.347a22.626 22.626 0 0 0 5.6-3.224V28h-5.6ZM0 28V9.081a22.627 22.627 0 0 0 5.6 3.245V28H0Z" />
    </svg>
  );
}

export function IntersectIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={IntersectSvg} {...props} />;
}
