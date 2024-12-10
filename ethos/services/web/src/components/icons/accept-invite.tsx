import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { AcceptInviteSvg } from './accept-invite.svg';

export function AcceptInviteIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={AcceptInviteSvg} {...props} />;
}
