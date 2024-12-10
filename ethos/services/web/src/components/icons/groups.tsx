import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';

function Svg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      fill="currentColor"
      viewBox="0 0 12 12"
    >
      <path d="M6 6.375c.815 0 1.535.195 2.12.45.54.24.88.78.88 1.365v.31c0 .275-.225.5-.5.5h-5a.501.501 0 0 1-.5-.5v-.305c0-.59.34-1.13.88-1.365A5.22 5.22 0 0 1 6 6.375ZM2 6.5c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1Zm.565.55C2.38 7.02 2.195 7 2 7c-.495 0-.965.105-1.39.29-.37.16-.61.52-.61.925V8.5c0 .275.225.5.5.5h1.75v-.805c0-.415.115-.805.315-1.145ZM10 6.5c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1Zm2 1.715c0-.405-.24-.765-.61-.925A3.475 3.475 0 0 0 10 7c-.195 0-.38.02-.565.05.2.34.315.73.315 1.145V9h1.75c.275 0 .5-.225.5-.5v-.285ZM6 3c.83 0 1.5.67 1.5 1.5S6.83 6 6 6s-1.5-.67-1.5-1.5S5.17 3 6 3Z" />
    </svg>
  );
}

export function Groups(props: Partial<CustomIconComponentProps>) {
  return <Icon component={Svg} {...props} />;
}
