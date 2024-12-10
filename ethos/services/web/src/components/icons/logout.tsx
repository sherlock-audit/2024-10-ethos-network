import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';

function Svg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      fill="currentColor"
      viewBox="0 0 12 12"
    >
      <path d="m9.917 4.667-.823.822.922.928H5.25v1.166h4.766l-.922.922.823.828L12.25 7 9.917 4.667Zm-7-1.75H7V1.75H2.917A1.17 1.17 0 0 0 1.75 2.917v8.166a1.17 1.17 0 0 0 1.167 1.167H7v-1.167H2.917V2.917Z" />
    </svg>
  );
}

export function LogoutIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={Svg} {...props} />;
}
