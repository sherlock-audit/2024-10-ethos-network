import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';

function Svg() {
  return (
    <svg
      width="1em"
      height="1em"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 6 12"
    >
      <path d="m2.938 1.886 1.64 1.64a.664.664 0 1 0 .94-.94L3.405.466a.664.664 0 0 0-.94 0L.352 2.586a.664.664 0 1 0 .94.94l1.646-1.64Zm0 8.227-1.64-1.64a.664.664 0 1 0-.94.94l2.114 2.12c.26.26.68.26.94 0L5.525 9.42a.664.664 0 1 0-.94-.94l-1.647 1.633Z" />
    </svg>
  );
}

export function Expand(props: Partial<CustomIconComponentProps>) {
  return <Icon component={Svg} {...props} />;
}
