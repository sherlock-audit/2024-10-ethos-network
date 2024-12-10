import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { ArrowUpSvg } from './arrow-up.svg';

export function ArrowUp(props: Partial<CustomIconComponentProps>) {
  return <Icon component={ArrowUpSvg} {...props} />;
}
