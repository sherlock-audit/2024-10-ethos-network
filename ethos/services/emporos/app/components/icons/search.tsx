import Icon, { type CustomIconComponentProps } from './icon.tsx';

export function SearchSvg() {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 30 30"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M19.695 17.816h-.987l-.35-.337a8.089 8.089 0 0 0 1.962-5.288 8.125 8.125 0 0 0-8.125-8.125 8.125 8.125 0 0 0-8.125 8.125 8.125 8.125 0 0 0 8.125 8.125 8.089 8.089 0 0 0 5.288-1.962l.337.35v.987l6.25 6.238 1.863-1.863-6.238-6.25Zm-7.5 0a5.617 5.617 0 0 1-5.625-5.625 5.617 5.617 0 0 1 5.625-5.625 5.617 5.617 0 0 1 5.625 5.625 5.617 5.617 0 0 1-5.625 5.625Z" />
    </svg>
  );
}

export function SearchIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={SearchSvg} {...props} />;
}
