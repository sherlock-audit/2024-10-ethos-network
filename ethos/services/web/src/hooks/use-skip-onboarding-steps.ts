import { useLocalStorage } from './use-storage';
import { getEnvironment } from 'config/environment';

const environment = getEnvironment();

export function useSkipOnboardingSteps() {
  const [showSkipOnboarding, setShowSkipOnboarding] = useLocalStorage(
    'dev.SKIP_ONBOARDING_STEPS',
    false,
  );

  return {
    showSkipOnboarding:
      // Allow onboarding skip on local/dev environments
      environment === 'local' || environment === 'dev' ? showSkipOnboarding : false,
    setShowSkipOnboarding,
  };
}
