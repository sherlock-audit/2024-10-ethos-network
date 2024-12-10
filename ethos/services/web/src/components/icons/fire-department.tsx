import Icon, { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { FireDepartmentSvg } from './fire-department.svg';

export function FireDepartmentIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={FireDepartmentSvg} {...props} />;
}
