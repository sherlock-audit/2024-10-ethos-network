import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { LikeFilledSvg } from './like-filled.svg';

export function LikeFilled(props: Partial<CustomIconComponentProps>) {
  return <Icon component={LikeFilledSvg} {...props} />;
}
