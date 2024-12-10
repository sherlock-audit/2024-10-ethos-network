import Icon, { type CustomIconComponentProps } from './icon.tsx';

function EthosStarSvg() {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 21 21"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.837 2.234h3.332v6.037l5.635-1.831 1.03 3.168-5.636 1.831 3.549 4.884-2.696 1.959-3.548-4.884-3.548 4.884-2.696-1.959 3.548-4.883-5.635-1.832 1.03-3.168 5.635 1.83V2.235Zm4.342 9.2-1.022-3.147H8.849l-1.023 3.146 2.677 1.945 2.676-1.944Z"
      />
    </svg>
  );
}

export function EthosStarIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={EthosStarSvg} {...props} />;
}
