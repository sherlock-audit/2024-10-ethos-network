import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { SlashFilledSvg } from './slash-filled.svg';

export function SlashFilled(props: Partial<CustomIconComponentProps>) {
  return <Icon component={SlashFilledSvg} {...props} />;
}
