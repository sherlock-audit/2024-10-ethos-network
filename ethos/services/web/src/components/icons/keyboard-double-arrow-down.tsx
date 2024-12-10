import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { KeyboardDoubleArrowDownSvg } from './keyboard-double-arrow-down.svg';

export function KeyboardDoubleArrowDown(props: Partial<CustomIconComponentProps>) {
  return <Icon component={KeyboardDoubleArrowDownSvg} {...props} />;
}
