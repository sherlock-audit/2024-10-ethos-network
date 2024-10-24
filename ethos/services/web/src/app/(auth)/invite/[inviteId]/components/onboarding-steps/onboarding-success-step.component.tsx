import { css } from '@emotion/react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from 'antd';
import { OnboardingStep } from '../onboarding-step.component';
import { OnboardingSuccessIcon } from 'components/icons';
import { tokenCssVars } from 'config';
import { ONBOARDING_SKIP_SESSION_KEY } from 'constant/constants';
import { invalidate } from 'constant/queries/cache.invalidation';
import { cacheKeys } from 'constant/queries/queries.constant';
import { useCurrentUser } from 'contexts/current-user.context';
import { useSessionStorage } from 'hooks/use-storage';

type Props = {
  stepCompleted: () => void;
};

export function OnboardingSuccessStep({ stepCompleted }: Props) {
  const queryClient = useQueryClient();
  const { connectedAddress } = useCurrentUser();
  const [, setSkipOnboardingValue] = useSessionStorage<boolean>(ONBOARDING_SKIP_SESSION_KEY);

  async function onFinish() {
    if (connectedAddress) {
      await invalidate(queryClient, [cacheKeys.profile.byAddress(connectedAddress)]);
      await invalidate(queryClient, [
        cacheKeys.invitation.bySubject({ address: connectedAddress }),
      ]);
      setSkipOnboardingValue(true);
      stepCompleted();
    }
  }

  return (
    <OnboardingStep
      icon={
        <OnboardingSuccessIcon
          css={css`
            color: ${tokenCssVars.colorPrimary};
            font-size: 62px;
          `}
        />
      }
      title={<>Success</>}
      description={
        <>
          Contributing to Ethos helps us best understand who and what
          <br /> can be trusted. These contributions happen in many ways.
        </>
      }
    >
      <div>
        <Button type="primary" onClick={onFinish}>
          Go to Ethos
        </Button>
      </div>
    </OnboardingStep>
  );
}
