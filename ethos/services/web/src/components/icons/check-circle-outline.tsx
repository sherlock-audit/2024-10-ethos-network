import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { CheckCircleOutlineSvg } from './check-circle-outline.svg';

export function CheckCircleOutline(props: Partial<CustomIconComponentProps>) {
  return <Icon component={CheckCircleOutlineSvg} {...props} />;
}
