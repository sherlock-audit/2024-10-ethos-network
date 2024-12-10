import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { IntersectSvg } from './intersect.svg';

export function IntersectIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={IntersectSvg} {...props} />;
}
