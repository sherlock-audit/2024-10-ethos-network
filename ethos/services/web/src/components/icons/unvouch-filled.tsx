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
      <path d="m.667 2 12 12.666.968-.917-12-12.666L.667 2ZM14.667 11.009l-1.064.585L11.695 9.6 12 9.432V4.01c.938-.295 1.83-.69 2.667-1.174v8.174ZM9.334 4.553v-3.22H12v2.676a13.27 13.27 0 0 1-2.666.544Z" />
      <path d="M9.334 4.553v2.578L6.887 4.573a13.513 13.513 0 0 0 2.447-.02ZM6.667 1.333v3.01L4 1.556v-.222h2.667ZM1.334 4.787v6.222l6.649 3.657h.034l1.812-.997-2.08-2.175L4 9.432V7.575L1.334 4.787Z" />
    </svg>
  );
}

export function UnvouchFilled(props: Partial<CustomIconComponentProps>) {
  return <Icon component={Svg} {...props} />;
}
