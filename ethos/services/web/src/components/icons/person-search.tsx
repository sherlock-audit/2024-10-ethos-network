import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';

function Svg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      fill="currentColor"
      viewBox="0 0 16 16"
    >
      <path d="M6.809 7.47a2.667 2.667 0 1 0 0-5.334 2.667 2.667 0 0 0 0 5.333ZM7.042 8.81c-1.82-.068-5.566.84-5.566 2.66v.666c0 .366.3.666.666.666h5.694c-1.647-1.84-.82-3.926-.794-3.993ZM13.096 11.482c.313-.533.466-1.18.32-1.88-.227-1.093-1.147-1.966-2.254-2.106a2.665 2.665 0 0 0-3 3 2.696 2.696 0 0 0 2.107 2.253c.7.147 1.347-.007 1.88-.32l1.24 1.24a.664.664 0 1 0 .94-.94l-1.233-1.247Zm-2.287-.013c-.733 0-1.333-.6-1.333-1.333 0-.734.6-1.334 1.333-1.334s1.333.6 1.333 1.334c0 .733-.6 1.333-1.333 1.333Z" />
    </svg>
  );
}

export function PersonSearchIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={Svg} {...props} />;
}
