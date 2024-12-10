import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { DiscordSvg } from './discord.svg';

export function DiscordIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={DiscordSvg} {...props} />;
}
