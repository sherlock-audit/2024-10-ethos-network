import { css, type SerializedStyles } from '@emotion/react';
import { pluralize } from '@ethos/helpers';
import { Button, Empty, Flex, theme, Typography } from 'antd';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zeroAddress } from 'viem';
import { ethosWaitlistLink } from 'constant/links';
import { useCurrentUser } from 'contexts/current-user.context';
import { useThemeMode } from 'contexts/theme-manager.context';
import { usePendingInvitationsBySubject } from 'hooks/user/lookup';
import { generateProfileInviteUrl } from 'utils/routing';

type InviteRequiredProps = {
  css?: SerializedStyles;
  closeModal?: () => void;
};

export function InviteRequired({ css: _css, closeModal }: InviteRequiredProps) {
  const mode = useThemeMode();
  const { token } = theme.useToken();
  const { connectedAddress } = useCurrentUser();
  const router = useRouter();
  const imageURL = `/assets/images/illustrations/no_data${mode === 'dark' ? '_dark' : ''}.svg`;

  const { data: pendingInvitations } = usePendingInvitationsBySubject({
    address: connectedAddress ?? zeroAddress,
  });
  const pendingInvitationsCount = pendingInvitations?.length ?? 0;

  const onAcceptInvitation = async () => {
    generateProfileInviteUrl(
      pendingInvitations?.at(-1)?.id ?? 0,
      connectedAddress ?? '',
      true,
    ).then((inviteUrl) => {
      router.push(inviteUrl);
      closeModal?.();
    });
  };

  const hasPendingInvitations = Boolean(pendingInvitations?.length && connectedAddress);

  return (
    <Flex
      vertical
      align="center"
      justify="center"
      gap={22}
      css={css`
        padding-block: ${token.paddingLG};
        ${_css}
      `}
    >
      <Flex vertical align="center" justify="center">
        <Empty
          image={imageURL}
          description={null}
          imageStyle={{
            height: 145,
          }}
        />
        <Typography.Title level={2}>
          {hasPendingInvitations ? 'Profile Required' : 'Invite Required'}
        </Typography.Title>
      </Flex>
      <Flex vertical gap={42} align="center">
        <Typography.Text
          type="secondary"
          css={css`
            max-width: 372px;
            font-size: 14px;
            line-height: 22px;
            text-align: center;
          `}
        >
          An Ethos profile is required to use the app. To set up an Ethos profile, you need an
          invitation from another Ethos user. If you do not have one, you can sign up for the
          waitlist.
        </Typography.Text>
        {!hasPendingInvitations ? (
          <Link href={ethosWaitlistLink} target="_blank">
            <Button type="primary" size="large">
              Join Waitlist
            </Button>
          </Link>
        ) : null}
        {hasPendingInvitations ? (
          <Flex vertical gap={12}>
            <Button type="primary" size="large" onClick={onAcceptInvitation}>
              Create profile
            </Button>
            <Typography.Text>
              You have {pendingInvitationsCount} pending{' '}
              {pluralize(pendingInvitationsCount, 'invitation', 'invitations')}.
            </Typography.Text>
          </Flex>
        ) : null}
      </Flex>
    </Flex>
  );
}
