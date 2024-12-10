import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';

export function PermissionSvg() {
  return (
    <svg
      width="1em"
      height="1em"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 75 74"
    >
      <path
        d="M7.9 37C7.9 20.6524 21.1524 7.4 37.5 7.4C53.8476 7.4 67.1 20.6524 67.1 37V66.6H37.5C21.1524 66.6 7.9 53.3476 7.9 37Z"
        stroke="currentColor"
        strokeWidth="14.8"
      />
    </svg>
  );
}

export function Permission(props: Partial<CustomIconComponentProps>) {
  return <Icon component={PermissionSvg} {...props} />;
}
