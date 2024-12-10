import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { LikeDislikeSvg } from './like-dislike.svg';

export function LikeDislike(props: Partial<CustomIconComponentProps>) {
  return <Icon component={LikeDislikeSvg} {...props} />;
}
