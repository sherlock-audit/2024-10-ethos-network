import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { ArrowDownSvg } from './arrow-down.svg';

export function ArrowDown(props: Partial<CustomIconComponentProps>) {
  return <Icon component={ArrowDownSvg} {...props} />;
}
