import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';

function Svg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 12 20"
      width="1em"
      height="1em"
      fill="currentColor"
    >
      <path d="M6.24089 0.750977L0.511719 10.376L6.24089 13.8135L11.9701 10.376L6.24089 0.750977ZM0.511719 11.5218L6.24089 19.5426L11.9701 11.5218L6.24089 14.9593L0.511719 11.5218Z" />
    </svg>
  );
}

export function Ethereum(props: Partial<CustomIconComponentProps>) {
  return <Icon component={Svg} {...props} />;
}
