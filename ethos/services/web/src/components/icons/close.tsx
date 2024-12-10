import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';

function Svg() {
  return (
    <svg
      width="1em"
      height="1em"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g id="close">
        <path
          id="Vector"
          d="M15.8337 5.34175L14.6587 4.16675L10.0003 8.82508L5.34199 4.16675L4.16699 5.34175L8.82533 10.0001L4.16699 14.6584L5.34199 15.8334L10.0003 11.1751L14.6587 15.8334L15.8337 14.6584L11.1753 10.0001L15.8337 5.34175Z"
        />
      </g>
    </svg>
  );
}

export function Close(props: Partial<CustomIconComponentProps>) {
  return <Icon component={Svg} {...props} />;
}
