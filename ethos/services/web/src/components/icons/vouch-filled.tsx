import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { VouchFilledSvg } from './vouch-filled.svg';

export function VouchFilled(props: Partial<CustomIconComponentProps>) {
  return <Icon component={VouchFilledSvg} {...props} />;
}
