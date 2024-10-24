import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';

function Svg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      fill="currentColor"
      viewBox="0 0 16 16"
    >
      <path d="M4.136 5.668h-2A.669.669 0 0 1 1.469 5c0-.367.3-.667.667-.667h2c.366 0 .666.3.666.667 0 .367-.3.667-.666.667Zm0 2h-2c-.367 0-.667.3-.667.666 0 .367.3.667.667.667h2c.366 0 .666-.3.666-.667 0-.366-.3-.666-.666-.666Zm9.253 4.193-2.08-2.08a3.319 3.319 0 0 1-2 .547c-1.58-.074-2.933-1.307-3.147-2.874a3.342 3.342 0 0 1 3.887-3.74c1.3.22 2.38 1.234 2.667 2.52.22.974.006 1.88-.467 2.6l2.087 2.087c.26.26.26.68 0 .94a.672.672 0 0 1-.947 0ZM11.469 7c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2Zm-9.333 5.333h5.333c.367 0 .667-.3.667-.666 0-.367-.3-.667-.667-.667H2.136c-.367 0-.667.3-.667.667 0 .366.3.666.667.666Z" />
    </svg>
  );
}

export function ManageSearch(props: Partial<CustomIconComponentProps>) {
  return <Icon component={Svg} {...props} />;
}
