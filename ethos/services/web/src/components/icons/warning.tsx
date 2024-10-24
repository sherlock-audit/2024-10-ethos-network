import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';

function Svg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      fill="currentColor"
      viewBox="0 0 17 15"
    >
      <path d="m8.25 2.993 5.648 9.757H2.602L8.25 2.992ZM8.25 0 0 14.25h16.5L8.25 0ZM9 10.5H7.5V12H9v-1.5ZM9 6H7.5v3H9V6Z" />
    </svg>
  );
}

export function WarningIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={Svg} {...props} />;
}
