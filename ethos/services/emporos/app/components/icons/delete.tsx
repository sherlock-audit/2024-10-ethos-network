import Icon, { type CustomIconComponentProps } from './icon.tsx';

// TODO: use em unit if we can use same height and width
export function DeleteSvg() {
  return (
    <svg
      width="28"
      height="22"
      viewBox="0 0 28 22"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M25.547.5h-17.5c-.805 0-1.435.408-1.855 1.027l-5.88 8.831a1.185 1.185 0 0 0 0 1.295l5.88 8.82c.42.607 1.05 1.027 1.855 1.027h17.5a2.34 2.34 0 0 0 2.333-2.333V2.833A2.34 2.34 0 0 0 25.547.5ZM21.23 16.017a1.162 1.162 0 0 1-1.645 0l-3.372-3.372-3.371 3.372a1.162 1.162 0 0 1-1.645 0 1.162 1.162 0 0 1 0-1.645L14.568 11l-3.371-3.372a1.162 1.162 0 0 1 0-1.645 1.162 1.162 0 0 1 1.645 0l3.371 3.372 3.372-3.372a1.162 1.162 0 0 1 1.645 0c.455.455.455 1.19 0 1.645L17.858 11l3.372 3.372c.443.443.443 1.19 0 1.645Z" />
    </svg>
  );
}

export function DeleteIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={DeleteSvg} {...props} />;
}
