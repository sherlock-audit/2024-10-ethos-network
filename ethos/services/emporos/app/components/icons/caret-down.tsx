import Icon, { type CustomIconComponentProps } from './icon.tsx';

function CaretDownSvg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      fill="currentColor"
      viewBox="0 0 16 16"
    >
      <path d="M11.06 5.53 8 8.583 4.94 5.53 4 6.47l4 4 4-4-.94-.94Z" />
    </svg>
  );
}

export function CaretDownIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={CaretDownSvg} {...props} />;
}
