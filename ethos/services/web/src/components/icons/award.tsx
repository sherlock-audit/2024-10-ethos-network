import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { AwardSvg } from './award.svg';

export function AwardIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={AwardSvg} {...props} />;
}
