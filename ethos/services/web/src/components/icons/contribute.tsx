import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { ContributeSvg } from './contribute.svg';

export function ContributeIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={ContributeSvg} {...props} />;
}
