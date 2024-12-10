import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { SolanaSvg } from './solana.svg';

export function SolanaIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={SolanaSvg} {...props} />;
}
