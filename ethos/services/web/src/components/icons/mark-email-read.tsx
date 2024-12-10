import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';

function Svg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      fill="currentColor"
      viewBox="0 0 14 14"
    >
      <path d="M11.375 1.75H2.042C1.4 1.75.88 2.275.88 2.917l-.006 7a1.17 1.17 0 0 0 1.167 1.166h4.666V9.917H2.042V4.083L6.708 7l4.667-2.917V7h1.167V2.917a1.17 1.17 0 0 0-1.167-1.167ZM6.708 5.833 2.042 2.917h9.333L6.708 5.833Zm3.115 6.417-2.065-2.065.823-.822 1.237 1.236 2.473-2.473.834.822-3.302 3.302Z" />
    </svg>
  );
}

export function MarkEmailReadIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={Svg} {...props} />;
}
