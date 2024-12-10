import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { OnboardingSuccessSvg } from './onboarding-success.svg';

export function OnboardingSuccessIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={OnboardingSuccessSvg} {...props} />;
}
