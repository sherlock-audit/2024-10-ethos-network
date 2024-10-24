import { css } from '@emotion/react';
import { type Vouch } from '@ethos/blockchain-manager';
import { Button, Modal, Radio, type RadioChangeEvent, theme } from 'antd';
import { useState } from 'react';
import { useUnvouch } from 'hooks/api/blockchain-manager';

type Props = {
  close: () => void;
  isOpen: boolean;
  vouch: Vouch | null;
};

export function UnvouchModalComponent({ close, isOpen, vouch }: Props) {
  const { token } = theme.useToken();
  const [isVouchHealthy, setIsVouchHealthy] = useState(true);
  const unvouch = useUnvouch(isVouchHealthy);

  const isUnvouchInProgress = unvouch.isPending;

  const onCancel = () => {
    if (!isUnvouchInProgress) close();
  };

  const onChange = (e: RadioChangeEvent) => {
    setIsVouchHealthy(e.target.value as boolean);
  };

  const onConfirm = async () => {
    if (vouch) {
      try {
        await unvouch.mutateAsync(vouch?.id);
        close();
      } catch {
        // No special cases to handle
      }
    }
  };

  return (
    <Modal
      title="Confirm removal of vouch"
      open={isOpen}
      closable={!isUnvouchInProgress}
      onCancel={onCancel}
      footer={[
        <Button key="profile-cancel" onClick={close} disabled={isUnvouchInProgress}>
          Cancel
        </Button>,
        <Button
          key="profile-verify"
          onClick={onConfirm}
          type="primary"
          loading={isUnvouchInProgress}
        >
          Confirm
        </Button>,
      ]}
    >
      <div
        css={css`
          line-height: 22px;
        `}
      >
        Please indicate if the removal of this vouch was healthy or unhealthy. Removal of vouches
        marked as unhealthy is used to indicate that the person vouched for has done something
        negative to cause you to unvouch.
      </div>
      <div
        css={css`
          margin-top: ${token.marginSM}px;
          margin-bottom: ${token.marginSM}px;
        `}
      >
        <Radio.Group onChange={onChange} value={isVouchHealthy}>
          <Radio value={true}>Healthy</Radio>
          <Radio value={false}>Unhealthy</Radio>
        </Radio.Group>
      </div>
    </Modal>
  );
}
