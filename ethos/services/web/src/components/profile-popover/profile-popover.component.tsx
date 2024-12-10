import { fromUserKey } from '@ethos/domain';
import { ProfileMiniCard } from './profile-mini-card.component';
import { CustomPopover } from 'components/custom-popover/custom-popover.component';
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
  return (
    <CustomPopover
      arrow={false}
      mouseEnterDelay={0.65}
      mouseLeaveDelay={0.5}
      overlayClassName="profile-popover"
      overlayInnerStyle={{
        padding: 0,
        overflow: 'hidden',
      }}
      content={
        showHoverCard ? (
          <ProfileMiniCard
            target={fromUserKey(actor.userkey)}
            actor={actor}
            openLinkInNewTab={openLinkInNewTab}
          />
        ) : null
      }
    >
      {children}
    </CustomPopover>
  );
}
