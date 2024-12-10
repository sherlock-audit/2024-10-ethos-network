import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { ArrowUpThinSvg } from './arrow-up-thin.svg';

export function ArrowUpThinIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={ArrowUpThinSvg} {...props} />;
}
