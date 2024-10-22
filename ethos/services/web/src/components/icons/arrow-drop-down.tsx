import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';

function Svg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M7 9.5L12 14.5L17 9.5H7Z" />
    </svg>
  );
}

export function ArrowDropDown(props: Partial<CustomIconComponentProps>) {
  return <Icon component={Svg} {...props} />;
}
