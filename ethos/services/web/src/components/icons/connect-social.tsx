import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { ConnectSocialSvg } from './connect-social.svg';

export function ConnectSocialIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={ConnectSocialSvg} {...props} />;
}
