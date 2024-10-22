import { css } from '@emotion/react';
import { type ReviewTarget, ScoreByValue, type ScoreValue } from '@ethos/blockchain-manager';
import { type EthosUserTarget, reviewActivity } from '@ethos/domain';
import { isAddressEqualSafe } from '@ethos/helpers';
import { useFeatureGate } from '@statsig/react-bindings';
import { Modal } from 'antd';
import { useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { zeroAddress } from 'viem';
import { featureGates } from '../../../../../constant/feature-flags';
import { ReviewVouchConfirmation } from '../review-vouch-confirmation/review-vouch-confirmation.component';
import { ReviewFormInput } from './review-action.component';
import { ReviewTypeIndicator } from 'components/review-type-indicator/review-type-indicator.component';
import { UserActionModal } from 'components/user-action-modal/user-action-modal.component';
import { type FormInputs } from 'components/user-action-modal/user-action-modal.types';
import { useAddReview } from 'hooks/api/blockchain-manager';
import { usePrimaryAddress } from 'hooks/user/lookup';
import { eventBus } from 'utils/event-bus';

type Props = {
  target: EthosUserTarget;
  isOpen: boolean;
  close: (successful: boolean) => void;
  defaultScore?: ScoreValue;
  hideConfirmation?: boolean;
};

const ERROR_MESSAGES = {
  score: 'You must select a review type.',
  title: 'Your review must include a title.',
};

export function ReviewModal({ target, isOpen, close, defaultScore, hideConfirmation }: Props) {
  const [displayConfirmationMessage, setDisplayConfirmationMessage] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');
  const primaryAddress = usePrimaryAddress(target).data;
  const { value: showVouchReviewShareModal } = useFeatureGate(
    featureGates.showVouchReviewShareModal,
  );

  const subject: ReviewTarget =
    'profileId' in target ? { address: primaryAddress ?? zeroAddress } : target;

  const addReview = useAddReview();

  const form = useForm<FormInputs<ScoreValue>>({
    reValidateMode: 'onSubmit',
    defaultValues: { title: '', description: '', value: defaultScore },
  });

  const closeModal = () => {
    form.reset();
    setDisplayConfirmationMessage(false);
    close(false);
  };

  const onSubmit: SubmitHandler<FormInputs<ScoreValue>> = async (data) => {
    const score = ScoreByValue[data.value];
    const errors: string[] = [];

    if (!score) {
      errors.push(ERROR_MESSAGES.score);
      form.setError('value', { type: 'required', message: ERROR_MESSAGES.score });
    }

    if (!data.title) {
      errors.push(ERROR_MESSAGES.title);
      form.setError('title', { type: 'required', message: ERROR_MESSAGES.title });
    }

    if (errors.length > 0) return;

    if ('address' in target && isAddressEqualSafe(target.address, zeroAddress)) return;
    if ('service' in target && target.account === '') return;
    try {
      const reviewPayload = {
        subject,
        score,
        comment: data.title,
        metadata: {
          description: data?.description?.trim(),
        },
      };
      const { hash } = await addReview.mutateAsync(reviewPayload);
      setTransactionHash(hash);
      form.reset();

      if (showVouchReviewShareModal && !hideConfirmation) {
        setDisplayConfirmationMessage(true);
      } else {
        close(true);
      }

      eventBus.emit('REVIEW_ADDED', reviewPayload);
      form.reset();
    } catch (e) {
      console.error('Failed to review', e);
    }
  };

  const typeValue = form.getValues().value;

  return (
    <Modal
      open={isOpen}
      onOk={closeModal}
      onCancel={closeModal}
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
          activityType={reviewActivity}
          close={close}
        />
      ) : (
        <UserActionModal
          type="review"
          customInputBlock={<ReviewFormInput form={form} />}
          score={ScoreByValue[form.watch('value')]}
          title="Review."
          target={target}
          isSubmitting={form.formState.isSubmitting}
          form={form}
          handleSubmit={form.handleSubmit(onSubmit)}
          actionComponent={
            ScoreByValue[typeValue] && <ReviewTypeIndicator scoreType={ScoreByValue[typeValue]} />
          }
        />
      )}
    </Modal>
  );
}
