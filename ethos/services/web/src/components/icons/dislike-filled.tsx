import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { DislikeFilledSvg } from './dislike-filled.svg';

export function DislikeFilled(props: Partial<CustomIconComponentProps>) {
  return <Icon component={DislikeFilledSvg} {...props} />;
}
