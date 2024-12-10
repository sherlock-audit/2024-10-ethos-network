import Icon, { type CustomIconComponentProps } from './icon.tsx';

export function ErrorOutlineSvg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <path d="M7.83398 10.0007H9.16732V11.334H7.83398V10.0007ZM7.83398 4.66732H9.16732V8.66732H7.83398V4.66732ZM8.49398 1.33398C4.81398 1.33398 1.83398 4.32065 1.83398 8.00065C1.83398 11.6807 4.81398 14.6673 8.49398 14.6673C12.1807 14.6673 15.1673 11.6807 15.1673 8.00065C15.1673 4.32065 12.1807 1.33398 8.49398 1.33398ZM8.50065 13.334C5.55398 13.334 3.16732 10.9473 3.16732 8.00065C3.16732 5.05398 5.55398 2.66732 8.50065 2.66732C11.4473 2.66732 13.834 5.05398 13.834 8.00065C13.834 10.9473 11.4473 13.334 8.50065 13.334Z" />
    </svg>
  );
}

export function ErrorOutlineIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={ErrorOutlineSvg} {...props} />;
}
