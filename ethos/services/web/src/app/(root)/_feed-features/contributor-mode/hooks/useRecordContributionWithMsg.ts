import { type ContributionActionRequest } from '@ethos/echo-client';
import { App } from 'antd';
import { useCallback } from 'react';
import { type ContributionRecordAction } from '../helpers/steps';
import { useRecordContributionAction } from 'hooks/api/echo.hooks';

export type ActionStatus = 'success' | 'error' | 'skipped';

export type OnContribute = (action: ContributionRecordAction, status: ActionStatus) => void;

export function useRecordContributionWithMsg({ onContribute }: { onContribute: OnContribute }) {
  const { mutateAsync, isPending } = useRecordContributionAction();
  const { notification } = App.useApp();

  const recordAction = useCallback(
    async ({
      contributionId,
      action,
    }: {
      contributionId: ContributionActionRequest['id'];
      action: ContributionRecordAction;
    }) => {
      await mutateAsync(
        { id: contributionId, action },
        {
          onError: () => {
            notification.error({
              message: 'Failed to record contribution action',
            });
          },
          onSuccess: () => {
            onContribute(action, 'success');
          },
        },
      );
    },
    [mutateAsync, onContribute, notification],
  );

  return { recordAction, isPending };
}
