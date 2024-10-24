import { fromUserKey } from '@ethos/domain';
import { Popover } from 'antd';
import { ProfileMiniCard } from './profile-mini-card.component';
import { type Actor } from 'types/activity';

type ProfilePopoverProps = {
  children: React.ReactNode;
  actor: Actor;
  showHoverCard?: boolean;
  openLinkInNewTab?: boolean;
};

export function ProfilePopover({
  children,
  actor,
  showHoverCard = true,
  openLinkInNewTab,
}: ProfilePopoverProps) {
  const target = showHoverCard ? fromUserKey(actor.userkey) : undefined;

  return (
    <Popover
      arrow={false}
      mouseEnterDelay={0.65}
      mouseLeaveDelay={0.5}
      overlayClassName="profile-popover"
      overlayInnerStyle={{
        padding: 0,
        overflow: 'hidden',
      }}
      content={
        target ? (
          <ProfileMiniCard target={target} actor={actor} openLinkInNewTab={openLinkInNewTab} />
        ) : null
      }
    >
      {children}
    </Popover>
  );
}
