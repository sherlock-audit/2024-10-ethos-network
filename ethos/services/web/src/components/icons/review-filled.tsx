import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { ReviewFilledSvg } from './review-filled.svg';

export function ReviewFilled(props: Partial<CustomIconComponentProps>) {
  return <Icon component={ReviewFilledSvg} {...props} />;
}
