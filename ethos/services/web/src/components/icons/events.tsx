import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { EventsSvg } from './events.svg';

export function EventsIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={EventsSvg} {...props} />;
}
