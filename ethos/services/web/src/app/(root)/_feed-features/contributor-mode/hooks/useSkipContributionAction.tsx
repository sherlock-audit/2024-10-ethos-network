import { App } from 'antd';
import { useCallback } from 'react';
import { type OnContribute } from './useRecordContributionWithMsg';
import { useRecordContributionAction } from 'hooks/api/echo.hooks';

export function useSkipContributionAction({
  contributionId,
  onContribute,
}: {
  contributionId: number;
  onContribute: OnContribute;
}) {
  const { notification } = App.useApp();
  const { mutateAsync, isPending } = useRecordContributionAction();

  const skipAction = useCallback(() => {
    mutateAsync(
      { id: contributionId, action: { type: 'SKIP' } },
      {
        onError: () => {
          notification.error({
            message: 'Failed to skip contribution',
          });
        },
        onSuccess: () => {
          onContribute({ type: 'SKIP' }, 'success');
        },
      },
    );
  }, [mutateAsync, contributionId, onContribute, notification]);

  return {
    skipAction,
    isPending,
  };
}
