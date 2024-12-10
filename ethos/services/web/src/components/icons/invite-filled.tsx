import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';

function Svg() {
  return (
    <svg
      width="1em"
      height="1em"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 60 60"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M48 22c0 9.941-8.059 18-18 18s-18-8.059-18-18S20.059 4 30 4s18 8.059 18 18Zm-12 0a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z"
        fill="currentColor"
      />
      <path
        d="M60 34.479A51.762 51.762 0 0 1 30 44a51.762 51.762 0 0 1-30-9.521v14.069C8.948 53.305 19.16 56 30 56s21.052-2.695 30-7.452v-14.07Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function InviteFilled(props: Partial<CustomIconComponentProps>) {
  return <Icon component={Svg} {...props} />;
}
