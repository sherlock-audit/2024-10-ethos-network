import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { AssignmentSvg } from './assignment.svg';

export function AssignmentIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={AssignmentSvg} {...props} />;
}
