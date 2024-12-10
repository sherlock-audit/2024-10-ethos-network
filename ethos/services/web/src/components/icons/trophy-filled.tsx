import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { TrophyFilledSvg } from './trophy-filled.svg';

export function TrophyFilled(props: Partial<CustomIconComponentProps>) {
  return <Icon component={TrophyFilledSvg} {...props} />;
}
