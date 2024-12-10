import Icon, { type CustomIconComponentProps } from './icon.tsx';

function ArticleSvg() {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g>
        <path d="M19 5v14H5V5h14Zm0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Z" />
        <path d="M14 17H7v-2h7v2Zm3-4H7v-2h10v2Zm0-4H7V7h10v2Z" />
      </g>
    </svg>
  );
}

export function ArticleIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={ArticleSvg} {...props} />;
}
