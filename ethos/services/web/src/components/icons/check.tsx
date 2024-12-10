import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { CheckSvg } from './check.svg';

export function CheckIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={CheckSvg} {...props} />;
}
