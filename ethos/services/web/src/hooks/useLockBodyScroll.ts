import { usePreventScroll } from '@react-aria/overlays';
import { useIsIOS } from './use-is-IOS';

/**
 * Fixes scroll issue inside overlays on IOS https://github.com/ant-design/ant-design/issues/23202
 * @warning This will prevent scrolling input fields too. Use it with caution.
 */
export function useLockBodyScroll(isEnabled: boolean) {
  const isIOS = useIsIOS();

  usePreventScroll({
    isDisabled: !isEnabled || !isIOS, // Prevent scroll on IOS only
  });
}
