import Icon, { type CustomIconComponentProps } from './icon.tsx';

export function HandCoinSvg() {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 15 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.747 6.68229C12.587 6.68229 14.0803 5.18896 14.0803 3.34896C14.0803 1.50896 12.587 0.015625 10.747 0.015625C8.90699 0.015625 7.41366 1.50896 7.41366 3.34896C7.41366 5.18896 8.90699 6.68229 10.747 6.68229ZM14.3803 10.4156C14.1203 10.149 13.7937 10.0156 13.4137 10.0156H8.74699L7.36033 9.52896L7.58033 8.90229L8.74699 9.34896H10.6137C10.847 9.34896 11.0337 9.25563 11.187 9.10229C11.3403 8.94896 11.4137 8.76229 11.4137 8.55563C11.4137 8.19563 11.2403 7.94896 10.8937 7.80896L6.04699 6.01563H4.74699V12.0156L9.41366 13.349L14.767 11.349C14.7737 10.9956 14.6403 10.6823 14.3803 10.4156ZM3.41366 6.01563H0.736328V13.349H3.41366V6.01563Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function HandCoinIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={HandCoinSvg} {...props} />;
}
