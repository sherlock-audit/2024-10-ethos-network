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
      <path d="m9.067 5.253-.947-.946L5.293 7.14 3.88 5.72l-.947.947 2.36 2.36 3.774-3.774Z" />
      <path d="M10.667.667H1.333C.593.667 0 1.267 0 2v8c0 .733.593 1.333 1.333 1.333h9.334c.733 0 1.333-.6 1.333-1.333V2c0-.733-.593-1.333-1.333-1.333Zm0 9.333H1.333V3.333h9.334V10Z" />
    </svg>
  );
}

export function CheckWindow(props: Partial<CustomIconComponentProps>) {
  return <Icon component={Svg} {...props} />;
}
