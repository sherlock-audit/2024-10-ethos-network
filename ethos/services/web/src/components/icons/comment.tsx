import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { CommentSvg } from './comment.svg';

export function Comment(props: Partial<CustomIconComponentProps>) {
  return <Icon component={CommentSvg} {...props} />;
}
