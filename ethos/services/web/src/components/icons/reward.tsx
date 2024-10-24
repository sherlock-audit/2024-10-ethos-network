import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { RewardSvg } from './reward.svg';

export function RewardFilled(props: Partial<CustomIconComponentProps>) {
  return <Icon component={RewardSvg} {...props} />;
}
