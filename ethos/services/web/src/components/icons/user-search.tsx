import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';

function Svg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 14 14"
      fill="currentColor"
    >
      <path d="M5.833 6.417a2.333 2.333 0 1 0 .001-4.666 2.333 2.333 0 0 0-.001 4.666Zm0-3.5a1.17 1.17 0 0 1 1.166 1.166A1.17 1.17 0 0 1 5.833 5.25a1.17 1.17 0 0 1-1.167-1.167 1.17 1.17 0 0 1 1.167-1.166ZM2.333 9.917c.128-.42 1.93-1.167 3.5-1.167 0-.408.076-.8.204-1.16-1.593-.06-4.871.734-4.871 2.327v1.166h5.565a3.426 3.426 0 0 1-.694-1.166H2.333ZM11.334 9.928c.21-.344.332-.746.332-1.178a2.333 2.333 0 1 0-2.333 2.333c.431 0 .834-.128 1.178-.332l1.5 1.499.822-.822c-.875-.876-.461-.467-1.5-1.5Zm-2.001-.011A1.17 1.17 0 0 1 8.166 8.75a1.17 1.17 0 0 1 1.167-1.167 1.17 1.17 0 0 1 1.166 1.167 1.17 1.17 0 0 1-1.166 1.167Z" />
    </svg>
  );
}

export function UserSearch(props: Partial<CustomIconComponentProps>) {
  return <Icon component={Svg} {...props} />;
}
