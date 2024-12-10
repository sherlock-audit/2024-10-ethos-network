import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';

function Svg() {
  return (
    <svg
      width="1em"
      height="1em"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 14 13"
    >
      <path d="M12.777 10.222v.667c0 .733-.6 1.333-1.333 1.333H2.111c-.74 0-1.334-.6-1.334-1.333V1.556c0-.734.594-1.334 1.334-1.334h9.333c.733 0 1.333.6 1.333 1.334v.666h-6c-.74 0-1.333.6-1.333 1.333V8.89c0 .733.593 1.333 1.333 1.333h6Zm-6-1.333h6.667V3.556H6.777v5.333Zm2.667-1.667c-.553 0-1-.447-1-1 0-.553.447-1 1-1 .553 0 1 .447 1 1 0 .553-.447 1-1 1Z" />
    </svg>
  );
}

export function Wallet(props: Partial<CustomIconComponentProps>) {
  return <Icon component={Svg} {...props} />;
}
