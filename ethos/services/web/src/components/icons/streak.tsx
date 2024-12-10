import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { FireSvg } from './streak.svg';

export function FireIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={FireSvg} {...props} />;
}
