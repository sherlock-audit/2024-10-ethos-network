import { css } from '@emotion/react';
import { type ActivityActor, fromUserKey, X_SERVICE } from '@ethos/domain';
import { Flex, Typography, theme } from 'antd';
import { type TextProps } from 'antd/es/typography/Text';
import Link from 'next/link';
import { memo } from 'react';
import { PersonScore } from 'components/person-score/person-score.component';
import { ProfilePopover } from 'components/profile-popover/profile-popover.component';
import { tokenCssVars } from 'config/theme';
import { useRouteTo } from 'hooks/user/hooks';
import { type PageDestination } from 'types/activity';

type Size = 'default' | 'small' | 'large';

type PersonNameProps = {
  target: ActivityActor;
  destination?: PageDestination;
  size?: Size;
  weight?: 'default' | 'bold';
  color?: 'colorText' | 'colorTextSecondary' | 'colorPrimary';
  ellipsis?: TextProps['ellipsis'];
  openInNewTab?: boolean;
  showScore?: boolean;
  maxWidth?: string;
  showProfilePopover?: boolean;
};
const { Text } = Typography;

export const PersonName = memo(function PersonName({
  target,
  destination = 'profile',
  size = 'default',
  weight = 'bold',
  color = 'colorText',
  ellipsis,
  openInNewTab,
  showScore,
  maxWidth,
  showProfilePopover = true,
}: PersonNameProps) {
  const { score } = target;
  const targetRouteTo = useRouteTo(
    target.username
      ? { service: X_SERVICE, username: target.username }
      : fromUserKey(target.userkey),
  ).data;
  const { token } = theme.useToken();

  const fontSizes: Record<Size, number> = {
    default: token.fontSizeSM,
    small: 10,
    large: 14,
  };
  const fontWeight = weight === 'bold' ? 600 : 400;

  const personNameComponent = (
    <Text
      ellipsis={ellipsis}
      css={css`
        color: ${tokenCssVars[color]};
        max-width: ${maxWidth};
      `}
    >
      <Link
        href={targetRouteTo[destination]}
        css={css`
          font-weight: ${fontWeight};
          font-size: ${fontSizes[size]}px;
          color: ${tokenCssVars[color]};
          &:hover {
            opacity: 0.8;
          }
        `}
        target={openInNewTab ? '_blank' : undefined}
      >
        {target.name}
      </Link>
    </Text>
  );

  const content = showScore ? (
    <Flex
      gap={5}
      align="center"
      css={css`
        max-width: ${maxWidth};
      `}
    >
      {personNameComponent}
      {showScore && score && score > 0 && (
        <PersonScore size="small" score={score} variant="plain" />
      )}
    </Flex>
  ) : (
    personNameComponent
  );

  return showProfilePopover ? <ProfilePopover actor={target}>{content}</ProfilePopover> : content;
});
