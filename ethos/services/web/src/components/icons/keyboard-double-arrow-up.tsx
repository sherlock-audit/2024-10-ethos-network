import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { KeyboardDoubleArrowUpSvg } from './keyboard-double-arrow-up.svg';

export function KeyboardDoubleArrowUp(props: Partial<CustomIconComponentProps>) {
  return <Icon component={KeyboardDoubleArrowUpSvg} {...props} />;
}
