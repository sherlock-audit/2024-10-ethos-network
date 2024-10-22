import { Drawer, Grid, theme } from 'antd';
import { useCallback, useState } from 'react';
import { CompletionReward } from './completion-reward';
import { ContributorModeSteps } from './contributor-mode-steps';
import { tokenCssVars } from 'config';
import { useContributorMode } from 'contexts/contributor-mode.context';

const { useBreakpoint } = Grid;

export function ContributorMode() {
  const { isContributorModeOpen, setIsContributorModeOpen } = useContributorMode();
  const [hasCompleted, setHasCompleted] = useState(false);
  const { token } = theme.useToken();
  const { md } = useBreakpoint();

  const onClose = useCallback(() => {
    setIsContributorModeOpen(false);
  }, [setIsContributorModeOpen]);

  const onComplete = useCallback(() => {
    setHasCompleted(true);
  }, [setHasCompleted]);

  return (
    <Drawer
      open={isContributorModeOpen}
      closeIcon={null}
      afterOpenChange={() => {
        setHasCompleted(false);
      }}
      placement={md ? 'right' : 'bottom'}
      styles={{
        wrapper: {
          maxWidth: token.screenSM,
          width: '100%',
          height: '100%',
          marginLeft: 'auto',
        },
        body: {
          width: '100%',
          padding: 0,
          paddingTop: 16,
          backgroundColor: tokenCssVars.colorBgLayout,
        },
      }}
    >
      {hasCompleted ? (
        <CompletionReward onClose={onClose} />
      ) : (
        <ContributorModeSteps onComplete={onComplete} />
      )}
    </Drawer>
  );
}
