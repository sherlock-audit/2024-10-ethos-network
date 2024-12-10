import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import Icon from './icon.tsx';

export function WalletSvg() {
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

export function WalletOutlinedSvg() {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g>
        <path d="M20.5 7.28V5c0-1.1-.9-2-2-2h-14a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-2.28a2 2 0 0 0 1-1.72V9a2 2 0 0 0-1-1.72ZM19.5 9v6h-7V9h7Zm-15 10V5h14v2h-6c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h6v2h-14Z" />
        <path d="M15.5 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
      </g>
    </svg>
  );
}

export function WalletIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={WalletSvg} {...props} />;
}

export function WalletOutlinedIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={WalletOutlinedSvg} {...props} />;
}
