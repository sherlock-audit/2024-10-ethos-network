import Icon, { type CustomIconComponentProps } from './icon.tsx';

export function EthosLogoSvg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 100 100"
      fill="currentColor"
    >
      <path d="M49.8 49.9c0 3.4-.2 6.8-.6 10.1H0v20h44c-2.9 7.2-6.8 14-11.6 20H100V80H44c2.5-6.3 4.3-13 5.2-20H100V40H49.2c-.9-7-2.6-13.7-5.1-20H100V0H32.6c4.7 6 8.6 12.8 11.5 20H0v20h49.2c.4 3.2.6 6.5.6 9.9Z" />
    </svg>
  );
}

export function EthosLogoIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={EthosLogoSvg} {...props} />;
}
