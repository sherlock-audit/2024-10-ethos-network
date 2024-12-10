import Icon, { type CustomIconComponentProps } from './icon.tsx';

export function DoubleArrowRightSvg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 25 25"
      fill="currentColor"
    >
      <path d="M5.941 6.99a1.037 1.037 0 0 0 0 1.468L9.983 12.5l-4.042 4.042a1.037 1.037 0 1 0 1.47 1.468l4.78-4.78a1.037 1.037 0 0 0 0-1.47l-4.77-4.77a1.05 1.05 0 0 0-1.48 0Z" />
      <path d="M12.806 6.99a1.037 1.037 0 0 0 0 1.468l4.042 4.042-4.042 4.042a1.037 1.037 0 0 0 0 1.468 1.037 1.037 0 0 0 1.469 0l4.781-4.78a1.038 1.038 0 0 0 0-1.47l-4.781-4.78a1.047 1.047 0 0 0-1.469.01Z" />
    </svg>
  );
}

export function DoubleArrowRightIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={DoubleArrowRightSvg} {...props} />;
}
