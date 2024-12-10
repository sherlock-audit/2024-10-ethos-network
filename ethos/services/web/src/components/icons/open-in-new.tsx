import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';

function Svg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      fill="currentColor"
      viewBox="0 0 17 17"
    >
      <path d="M9.56087 2.73291V4.06624H11.9542L5.40087 10.6196L6.34087 11.5596L12.8942 5.00624V7.39958H14.2275V2.73291M12.8942 13.3996H3.56087V4.06624H8.22754V2.73291H3.56087C2.82087 2.73291 2.22754 3.33291 2.22754 4.06624V13.3996C2.22754 13.7532 2.36801 14.0923 2.61806 14.3424C2.86811 14.5924 3.20725 14.7329 3.56087 14.7329H12.8942C13.2478 14.7329 13.587 14.5924 13.837 14.3424C14.0871 14.0923 14.2275 13.7532 14.2275 13.3996V8.73291H12.8942V13.3996Z" />
    </svg>
  );
}

export function OpenInNewIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={Svg} {...props} />;
}
