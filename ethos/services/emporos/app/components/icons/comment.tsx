import Icon, { type CustomIconComponentProps } from './icon.tsx';

export function CommentSvg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="1em"
      viewBox="0 -960 960 960"
      width="1em"
      fill="currentColor"
    >
      <path d="M240-400h480v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80Zm-80 400q-33 0-56.5-23.5T80-320v-480q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v720L720-240H160Z" />
    </svg>
  );
}

export function CommentIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={CommentSvg} {...props} />;
}
