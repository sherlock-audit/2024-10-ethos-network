import Icon, { type CustomIconComponentProps } from './icon.tsx';

export function CloseSvg() {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="m13.14 1.828.001.001 1.03 1.03.001.002v.003L9.033 8l5.137 5.138.001.001v.003l-1.031 1.03-.001.001h-.003L7.999 9.035l-5.137 5.137-.002.001h-.002l-1.03-1.031-.002-.001v-.002l.001-.001L6.965 8 1.827 2.864v-.005l1.03-1.03h.005l5.137 5.138 5.138-5.138h.003Z"
      />
    </svg>
  );
}

export function CloseIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={CloseSvg} {...props} />;
}
