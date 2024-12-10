import { css } from '@emotion/react';
import { type Vouch } from '@ethos/blockchain-manager';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Modal, Radio, type RadioChangeEvent, theme } from 'antd';
import { useState } from 'react';
import { zeroAddress } from 'viem';
import { cacheKeysFor, invalidate } from 'constant/queries/cache.invalidation';
import { useCurrentUser } from 'contexts/current-user.context';
import { useUnvouch } from 'hooks/api/blockchain-manager';
import { useActor } from 'hooks/user/activities';
import { eventBus } from 'utils/event-bus';

type Props = {
  close: () => void;
  isOpen: boolean;
  vouch: Vouch | null;
};

export function UnvouchModalComponent({ close, isOpen, vouch }: Props) {
  const queryClient = useQueryClient();
  const { connectedAddress } = useCurrentUser();

  const { token } = theme.useToken();
  const [isVouchHealthy, setIsVouchHealthy] = useState(true);
  const unvouch = useUnvouch(isVouchHealthy);

  const subjectProfile = useActor({
    profileId: vouch?.subjectProfileId ?? -1,
  });

  const isUnvouchInProgress = unvouch.isPending;

  function onCancel() {
    if (!isUnvouchInProgress) close();
  }

  function onChange(e: RadioChangeEvent) {
    setIsVouchHealthy(e.target.value as boolean);
  }

  async function onConfirm() {
    if (vouch) {
      try {
        await unvouch.mutateAsync(vouch?.id);
        await invalidate(
          queryClient,
          cacheKeysFor.VouchChange(
            { address: connectedAddress ?? zeroAddress },
            { profileId: vouch?.subjectProfileId ?? -1 },
          ),
        );
        eventBus.emit('SCORE_UPDATED');
        close();
      } catch {
        // No special cases to handle
      }
    }
  }

  return (
    <Modal
      title={`Remove vouch for ${subjectProfile?.name ?? 'User'}?`}
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
