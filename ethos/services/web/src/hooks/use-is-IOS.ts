import { useMemo } from 'react';

export function useIsIOS() {
  const isIOS = useMemo(() => {
    if (typeof window === 'undefined') return false;

    const isIOSDevice =
      /iPad|iPhone|iPod/.test(window.navigator.userAgent) ||
      (window.navigator.userAgent.includes('Mac') && window.navigator.maxTouchPoints > 1);

    return isIOSDevice;
  }, []);

  return isIOS;
}
