import { css } from '@emotion/react';
import { type EthosUserTarget, vouchActivity } from '@ethos/domain';
import { useFeatureGate } from '@statsig/react-bindings';
import { Modal } from 'antd';
import { useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { useBalance } from 'wagmi';
import { featureGates } from '../../../../../constant/feature-flags';
import { ReviewVouchConfirmation } from '../review-vouch-confirmation/review-vouch-confirmation.component';
import { VouchAction } from './vouch-form.component';
import { calculateVouchAmounts } from './vouch-form.utils';
import { UserActionModal } from 'components/user-action-modal/user-action-modal.component';
import { type FormInputs } from 'components/user-action-modal/user-action-modal.types';
import { useCurrentUser } from 'contexts/current-user.context';
import { useVouchByProfileId } from 'hooks/api/blockchain-manager';
import { useFeesInfo } from 'hooks/api/echo.hooks';
import { useProfile } from 'hooks/user/lookup';

type Props = {
  target: EthosUserTarget;
  isOpen: boolean;
  close: (successful: boolean) => void;
  hideConfirmation?: boolean;
};

const ERROR_MESSAGES = {
  amount: 'Vouch amount is required.',
  title: 'Your review must include a title.',
  balance: "You don't have enough funds",
};

export function VouchModal({ target, isOpen, close, hideConfirmation }: Props) {
  const [displayConfirmationMessage, setDisplayConfirmationMessage] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');
  const vouch = useVouchByProfileId();
  const { data: profile, isPending } = useProfile(target);
  const { connectedAddress } = useCurrentUser();

  const { value: showVouchReviewShareModal } = useFeatureGate(
    featureGates.showVouchReviewShareModal,
  );

  const { data: balanceData } = useBalance({
    address: connectedAddress,
  });
  const { data: fees } = useFeesInfo();

  const balance = Number(balanceData?.formatted) ?? 0;

  const form = useForm<FormInputs<number>>({
    reValidateMode: 'onSubmit',
    defaultValues: { title: '', description: '' },
  });

  const closeVouchModal = () => {
    form.reset();
    setDisplayConfirmationMessage(false);
    close(false);
  };

  const onSubmitVouch: SubmitHandler<FormInputs<number>> = async (data) => {
    const errors: string[] = [];

    if (!data.value) {
      errors.push(ERROR_MESSAGES.amount);
      form.setError('value', { type: 'required', message: ERROR_MESSAGES.amount });
    }

    if (!data.title) {
      errors.push(ERROR_MESSAGES.title);
      form.setError('title', { type: 'required', message: ERROR_MESSAGES.title });
    }

    if (typeof data.value === 'number' && data.value >= balance) {
      errors.push(ERROR_MESSAGES.balance);
      form.setError('value', { type: 'required', message: ERROR_MESSAGES.balance });
    }

    if (errors.length > 0) return;

    if (!profile?.id) {
      return;
    }

    try {
      if (fees === undefined) return;
      const { totalAmountWithFees } = calculateVouchAmounts(data.value, fees);
      const { hash } = await vouch.mutateAsync({
        subjectProfileId: profile.id,
        paymentAmount: totalAmountWithFees.toFixed(8),
        comment: data.title,
        metadata: { description: data?.description?.trim() },
      });
      setTransactionHash(hash);

      if (showVouchReviewShareModal && !hideConfirmation) {
        setDisplayConfirmationMessage(true);
      } else {
        close(true);
      }
    } catch (e) {
      console.error('Failed to Vouch', e);
    }
  };

  const isVouchingInProgress = form.formState.isSubmitting;
  const onCancel = () => {
    if (!isVouchingInProgress) closeVouchModal();
  };

  return (
    <Modal
      open={isOpen}
      closable={!isVouchingInProgress}
      onOk={closeVouchModal}
      onCancel={onCancel}
      loading={isPending}
      maskClosable={false}
      footer={false}
      css={css`
        & .ant-modal-content {
          padding: ${displayConfirmationMessage ? 0 : null};
        }
      `}
    >
      {displayConfirmationMessage ? (
        <ReviewVouchConfirmation
          txHash={transactionHash}
          activityType={vouchActivity}
          close={close}
        />
      ) : (
        <UserActionModal
          type="vouch"
          title="Vouch."
          target={target}
          isSubmitting={isVouchingInProgress}
          form={form}
          handleSubmit={form.handleSubmit(onSubmitVouch)}
          actionComponent={<VouchAction form={form} fees={fees} />}
        />
      )}
    </Modal>
  );
}
