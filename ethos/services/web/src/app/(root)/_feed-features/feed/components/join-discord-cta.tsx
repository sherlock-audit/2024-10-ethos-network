import { Button } from 'antd';
import { DiscordIcon } from 'components/icons';
import { ethosDiscordLink } from 'constant/links';

export function JoinDiscordCta() {
  return (
    <Button
      href={ethosDiscordLink}
      icon={<DiscordIcon />}
      target="_blank"
      type="primary"
      size="large"
    >
      Join our Discord
    </Button>
  );
}
