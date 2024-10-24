import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { UncertainSvg } from './uncertain.svg';

export function UncertainIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={UncertainSvg} {...props} />;
}
