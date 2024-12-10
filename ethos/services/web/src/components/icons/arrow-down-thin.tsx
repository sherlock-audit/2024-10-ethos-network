import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { ArrowDownThinSvg } from './arrow-down-thin.svg';

export function ArrowDownThinIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={ArrowDownThinSvg} {...props} />;
}
