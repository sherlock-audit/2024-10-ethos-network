import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { FarcasterFilledSvg } from './farcaster-filled.svg';

export function FarcasterFilled(props: Partial<CustomIconComponentProps>) {
  return <Icon component={FarcasterFilledSvg} {...props} />;
}
