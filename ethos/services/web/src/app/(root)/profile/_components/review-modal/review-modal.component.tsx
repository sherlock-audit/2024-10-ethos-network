import { css } from '@emotion/react';
import { type ReviewTarget, ScoreByValue, type ScoreValue } from '@ethos/blockchain-manager';
import { type EthosUserTarget, reviewActivity } from '@ethos/domain';
import { isAddressEqualSafe } from '@ethos/helpers';
import { useFeatureGate } from '@statsig/react-bindings';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from 'antd';
import { type ContractTransactionResponse } from 'ethers';
import { useRef, useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { zeroAddress } from 'viem';
import { featureGates } from '../../../../../constant/feature-flags';
import { cacheKeysFor, invalidate } from '../../../../../constant/queries/cache.invalidation';
import { ReviewVouchConfirmation } from '../review-vouch-confirmation/review-vouch-confirmation.component';
import { ReviewFormInput } from './review-action.component';
import { UserActionModal } from 'components/user-action-modal/user-action-modal.component';
import { type FormInputs } from 'components/user-action-modal/user-action-modal.types';
import { useAddReview } from 'hooks/api/blockchain-manager';
import { usePrimaryAddress } from 'hooks/user/lookup';
import { type ScoreSimulationResult } from 'types/activity';
import { eventBus } from 'utils/event-bus';

type Props = {
  target: EthosUserTarget;
  isOpen: boolean;
  close: (
    successful: boolean,
    contractTransactionResponse: Pick<ContractTransactionResponse, 'hash'> | null,
  ) => void;
  defaultScore?: ScoreValue;
  hideConfirmation?: boolean;
};

const ERROR_MESSAGES = {
  score: 'You must select a review type.',
  title: 'Your review must include a title.',
};

export function ReviewModal({ target, isOpen, close, defaultScore, hideConfirmation }: Props) {
  const queryClient = useQueryClient();
  const [displayConfirmationMessage, setDisplayConfirmationMessage] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');
  const [latestScoreSimulation, setLatestScoreSimulation] = useState<ScoreSimulationResult | null>(
    null,
  );
  const txResult = useRef<Pick<ContractTransactionResponse, 'hash'> | null>(null);
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

  function closeModal() {
    form.reset();
    setDisplayConfirmationMessage(false);
    close(Boolean(txResult.current), txResult.current);
  }

  // eslint-disable-next-line func-style
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
      const result = await addReview.mutateAsync(reviewPayload);
      txResult.current = result;
      setTransactionHash(result.hash);
      form.reset();
      await invalidate(queryClient, cacheKeysFor.ScoreChange(target));
      eventBus.emit('SCORE_UPDATED');

      if (showVouchReviewShareModal && !hideConfirmation) {
        setDisplayConfirmationMessage(true);
      } else {
        close(true, result);
      }

      eventBus.emit('REVIEW_ADDED', reviewPayload);
      form.reset();
    } catch (e) {
      console.error('Failed to review', e);
    }
  };

  return (
    <Modal
      open={isOpen}
      onOk={closeModal}
      onCancel={closeModal}
      maskClosable={false}
      destroyOnClose
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
          close={() => {
            close(Boolean(txResult.current), txResult.current);
          }}
          scoreImpactSimulation={latestScoreSimulation}
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
          simulationChanged={(score: ScoreSimulationResult) => {
            setLatestScoreSimulation(score ?? null);
          }}
        />
      )}
    </Modal>
  );
}
