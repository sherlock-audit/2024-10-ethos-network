import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';

function Svg() {
  return (
    <svg
      width="1em"
      height="1em"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 14 14"
    >
      <path d="M13.598 1.666c0-.733-.593-1.333-1.327-1.333H1.605C.87.333.27.933.27 1.666v8C.271 10.4.871 11 1.605 11h9.333l2.667 2.666-.007-12Zm-3.327 4.667H7.605V9H6.27V6.333H3.605V5H6.27V2.333h1.334V5h2.666v1.333Z" />
    </svg>
  );
}

export function Reply(props: Partial<CustomIconComponentProps>) {
  return <Icon component={Svg} {...props} />;
}
