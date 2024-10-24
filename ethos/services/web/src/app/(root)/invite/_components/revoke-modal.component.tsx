import { css } from '@emotion/react';
import { App, Modal, Typography } from 'antd';
import { useCallback, useState } from 'react';
import { type Address } from 'viem';
import { useUninviteUser } from 'hooks/api/blockchain-manager';
import { eventBus } from 'utils/event-bus';

type Props = {
  isOpen: boolean;
  address: Address;
  close: () => void;
};

export function RevokeModal({ isOpen, address, close }: Props) {
  const { notification } = App.useApp();
  const [revokeInviteEnabled, setRevokeInviteEnabled] = useState(true);

  const revoke = useUninviteUser();

  const handleRevoke = useCallback(async () => {
    setRevokeInviteEnabled(false);
    try {
      const revokePayload = { uninvitedUser: address };
      await revoke.mutateAsync(revokePayload);
      notification.success({
        message: 'Your invitation has been revoked',
        duration: 10,
      });
      eventBus.emit('INVITATION_REVOKED', revokePayload);
      close();
    } catch (e) {}

    setRevokeInviteEnabled(true);
  }, [revoke, address, close, notification]);

  return (
    <Modal
      title="Confirm revoke invitation"
      open={isOpen}
      onCancel={close}
      onOk={handleRevoke}
      okText="Confirm"
      okButtonProps={{ disabled: !revokeInviteEnabled }}
      cancelButtonProps={{ type: 'text' }}
      width={520}
    >
      <Typography.Text
        css={css`
          margin-top: 8px;
        `}
      >
        Revoking an invitation requires a transaction on the blockchain. To complete the revocation
        of the invite, please click confirm to continue.
      </Typography.Text>
    </Modal>
  );
}
