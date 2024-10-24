import { css, type SerializedStyles } from '@emotion/react';
import { fromUserKey, X_SERVICE } from '@ethos/domain';
import { Avatar } from 'antd';
import { type AvatarSize } from 'antd/es/avatar/AvatarContext';
import Link from 'next/link';
import { memo } from 'react';
import { ProfilePopover } from '../profile-popover/profile-popover.component';
import { Score } from './score.component';
import { PersonIcon } from 'components/icons';
import { tokenCssVars } from 'config';
import { useRouteTo } from 'hooks/user/hooks';
import { getBlockieUrl } from 'hooks/user/lookup';
import { type Actor } from 'types/activity';

type Props = {
  size?: AvatarSize;
  actor: Actor;
  showHoverCard?: boolean;
  showScore?: boolean;
  renderAsLink?: boolean;
  elevated?: boolean;
  openLinkInNewTab?: boolean;
  wrapperCSS?: SerializedStyles;
};

export const UserAvatar = memo(function UserAvatar({
  actor,
  size = 'default',
  showScore = true,
  showHoverCard = true,
  renderAsLink = true,
  elevated = false,
  openLinkInNewTab = false,
  wrapperCSS,
}: Props) {
  const { avatar: actorAvatar, name, score, userkey } = actor;

  let target = null;

  if (userkey) {
    if (actor.username) {
      target = { service: X_SERVICE, username: actor.username };
    } else {
      target = fromUserKey(userkey);
    }
  }
  const targetRouteTo = useRouteTo(target).data;

  let avatar = actorAvatar;

  if (!avatar) {
    avatar = getBlockieUrl(actor.primaryAddress);
  }

  const avatarElement = (
    <Avatar
      size={size}
      alt={name ?? ''}
      src={avatar}
      icon={<PersonIcon />}
      css={css`
        background-color: ${tokenCssVars.colorTextQuaternary};
        color: ${tokenCssVars.colorTextDescription};
      `}
    />
  );

  return (
    <ProfilePopover actor={actor} showHoverCard={showHoverCard} openLinkInNewTab={openLinkInNewTab}>
      <div
        css={css`
          height: fit-content;
          position: relative;
          display: inline-block;
          ${wrapperCSS}
        `}
      >
        {renderAsLink ? (
          <Link href={targetRouteTo.profile} target={openLinkInNewTab ? '_blank' : '_self'}>
            {avatarElement}
          </Link>
        ) : (
          avatarElement
        )}
        {showScore && score && score > 0 && size !== 'small' ? (
          <Score size={size} score={score} elevated={elevated} />
        ) : null}
      </div>
    </ProfilePopover>
  );
});
