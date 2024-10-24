import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { SlashSvg } from './slash.svg';

export function SlashIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={SlashSvg} {...props} />;
}
