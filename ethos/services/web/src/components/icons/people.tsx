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
      <path
        d="M8 5.5c.83 0 1.495-.67 1.495-1.5S8.83 2.5 8 2.5c-.83 0-1.5.67-1.5 1.5S7.17 5.5 8 5.5Zm-4 0c.83 0 1.495-.67 1.495-1.5S4.83 2.5 4 2.5c-.83 0-1.5.67-1.5 1.5S3.17 5.5 4 5.5Zm0 1C2.835 6.5.5 7.085.5 8.25V9c0 .275.225.5.5.5h6c.275 0 .5-.225.5-.5v-.75C7.5 7.085 5.165 6.5 4 6.5Zm4 0c-.145 0-.31.01-.485.025.01.005.015.015.02.02.57.415.965.97.965 1.705V9c0 .175-.035.345-.09.5H11c.275 0 .5-.225.5-.5v-.75C11.5 7.085 9.165 6.5 8 6.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function People(props: Partial<CustomIconComponentProps>) {
  return <Icon component={Svg} {...props} />;
}
