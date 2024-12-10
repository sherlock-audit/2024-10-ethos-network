import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';

function Svg() {
  return (
    <svg
      width="1em"
      height="1em"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 11 12"
    >
      <path d="M10.223 4.556H7.556v-4h-4v4H.889l4.667 4.666 4.667-4.666Zm-9.334 6v1.333h9.334v-1.333H.889Z" />
    </svg>
  );
}

export function Download(props: Partial<CustomIconComponentProps>) {
  return <Icon component={Svg} {...props} />;
}
