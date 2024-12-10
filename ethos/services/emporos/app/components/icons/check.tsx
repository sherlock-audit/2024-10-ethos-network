import Icon, { type CustomIconComponentProps } from './icon.tsx';

export function CheckSvg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 77 76"
      fill="currentColor"
    >
      <path d="M28.35 50.271 17.362 39.283a3.154 3.154 0 0 0-4.465 0 3.154 3.154 0 0 0 0 4.465l13.237 13.236a3.154 3.154 0 0 0 4.465 0l33.503-33.503a3.154 3.154 0 0 0 0-4.465 3.154 3.154 0 0 0-4.465 0L28.35 50.271Z" />
    </svg>
  );
}

export function CheckIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={CheckSvg} {...props} />;
}
