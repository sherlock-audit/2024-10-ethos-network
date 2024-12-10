import { css } from '@emotion/react';
import { useCopyToClipboard } from '@ethos/common-ui';
import { App, Button, Flex, Input, Modal, Typography } from 'antd';
import Image from 'next/image';
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { type Address } from 'viem';
import { ClipboardIcon } from 'components/icons';
import { useCurrentUser } from 'contexts/current-user.context';
import { useInviteAddress } from 'hooks/api/blockchain-manager';
import { eventBus } from 'utils/event-bus';
import { generateProfileInviteUrl } from 'utils/routing';

type InviteLinkShareProps = {
  inviteLink: string;
};

function InviteLinkShare({ inviteLink }: InviteLinkShareProps) {
  const copyToClipboard = useCopyToClipboard();

  return (
    <Flex vertical gap={8}>
      <Typography.Text type="secondary">
        Copy the link below and share with whomever you are inviting. Only the wallet you specified
        will be able to accept this invitation.
      </Typography.Text>
      <Typography.Text>Invite Link</Typography.Text>
      <Input
        value={inviteLink}
        readOnly
        suffix={
          <Button
            type="text"
            size="small"
            css={css`
              column-gap: 4px;
              padding: 0;
            `}
            onClick={async () => {
              await copyToClipboard(inviteLink, 'Link copied successfully!');
            }}
            icon={<ClipboardIcon />}
          >
            Copy
          </Button>
        }
      />
    </Flex>
  );
}

type EnterAddressFormProps = {
  address?: Address;
  invitee: string;
  handleInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
};

function EnterAddressForm({ address, invitee, handleInputChange }: EnterAddressFormProps) {
  return (
    <Flex
      gap={8}
      vertical
      css={css`
        padding-top: 13px;
      `}
    >
      {!address && (
        <Typography.Text>
          Please paste the wallet address or ENS name of the user you are inviting.
        </Typography.Text>
      )}
      <Input
        placeholder="0xfee6e898ef66c0524e9beb3689ab235cd3e200d0"
        value={invitee}
        onChange={handleInputChange}
        readOnly={Boolean(address)}
      />
    </Flex>
  );
}

function NoInvitations() {
  return (
    <Flex
      vertical
      justify="center"
      align="center"
      gap={8}
      css={css`
        padding-top: 40px;
        padding-bottom: 40px;
      `}
    >
      <Image
        src="/assets/images/illustrations/no_invitations_icon.svg"
        height={119}
        width={82}
        alt="No invitations"
      />
      <Typography.Title>No invitations</Typography.Title>
      <Typography.Text
        css={css`
          line-height: 22px;
          font-size: 14px;
          text-align: center;
        `}
        type="secondary"
      >
        Ethos invitations are limited and given based on <br />
        early engagement. We are constantly improving <br />
        our invite allocation process.
      </Typography.Text>
    </Flex>
  );
}

enum ModalStep {
  Invite,
  Share,
}

type Props = {
  isOpen: boolean;
  close: () => void;
  address?: Address;
};

export function InviteModal({ isOpen, close, address }: Props) {
  const { notification } = App.useApp();

  const [generateInviteEnabled, setGenerateInviteEnabled] = useState(false);
  const [isGeneratingInvitationLink, setIsGeneratingInvitationLink] = useState(false);

  const [invitee, setInviteeAddress] = useState(address ?? '');
  const [step, setStep] = useState<ModalStep>(ModalStep.Invite);
  const [inviteLink, setInviteLink] = useState('');

  const invite = useInviteAddress();
  const { connectedProfile, connectedProfileAddresses } = useCurrentUser();
  const availableInvites = connectedProfile?.invitesAvailable ?? 0;

  useEffect(() => {
    setGenerateInviteEnabled(
      availableInvites > 0 && !connectedProfileAddresses.includes(invitee as Address),
    );
  }, [connectedProfile, invitee, availableInvites, connectedProfileAddresses]);

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    setInviteeAddress(e.target.value.trim());
  }

  const onClose = useCallback(() => {
    setStep(ModalStep.Invite);

    if (!address) {
      setInviteeAddress('');
    }

    close();
  }, [close, address]);

  const onInvite = useCallback(async () => {
    try {
      await invite.mutateAsync({ invitee });
      setIsGeneratingInvitationLink(true);

      if (connectedProfile) {
        setInviteLink(await generateProfileInviteUrl(connectedProfile.id, invitee));
        setStep(ModalStep.Share);
        eventBus.emit('INVITATION_ADDED');
      }
    } catch (e: unknown) {
      if (e instanceof Error && 'code' in e) {
        if (e.code !== 'ACTION_REJECTED') {
          notification.error({
            message: 'Error inviting user',
            key: 'invalid-invite',
          });
        }
      }
    } finally {
      setIsGeneratingInvitationLink(false);
    }
  }, [invite, invitee, connectedProfile, notification]);

  const { cancelButtonProps, okButtonProps, okText, onOk, title } = useMemo(() => {
    if (!availableInvites) {
      return {
        cancelButtonProps: { style: { display: 'none' } },
        okButtonProps: { style: { display: 'none' } },
        okText: '',
        onOk: onClose,
        title: '',
      };
    }
    switch (step) {
      case ModalStep.Invite:
        return {
          cancelButtonProps: { style: { display: 'inline-block' } },
          okText: 'Invite',
          onOk: onInvite,
          title: 'Invite',
        };
      case ModalStep.Share:
        return {
          cancelButtonProps: { style: { display: 'none' } },
          okText: 'Done',
          onOk: onClose,
          title: 'Share',
        };
    }
  }, [onClose, onInvite, step, availableInvites]);

  const isShareStep = step === ModalStep.Share && invite;
  const noInvitationsAvailable = availableInvites === 0;
  const isLoading = invite.isPending || isGeneratingInvitationLink;

  return (
    <Modal
      title={title}
      open={isOpen}
      onOk={onOk}
      onCancel={onClose}
      cancelButtonProps={{ ...cancelButtonProps, type: 'text' }}
      okText={okText}
      okButtonProps={{
        ...okButtonProps,
        disabled: !generateInviteEnabled,
        loading: isLoading,
      }}
    >
      {isShareStep ? (
        <InviteLinkShare inviteLink={inviteLink} />
      ) : noInvitationsAvailable ? (
        <NoInvitations />
      ) : (
        <EnterAddressForm
          address={address}
          invitee={invitee}
          handleInputChange={handleInputChange}
        />
      )}
    </Modal>
  );
}
