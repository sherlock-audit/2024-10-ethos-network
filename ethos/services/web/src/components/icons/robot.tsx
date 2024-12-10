import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { RobotSvg } from './robot.svg';

export function RobotIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={RobotSvg} {...props} />;
}
