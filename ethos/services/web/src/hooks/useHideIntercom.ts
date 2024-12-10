import { useEffect } from 'react';
import { useIntercom } from 'react-use-intercom';

export function useHideIntercom(isHidden = true) {
  const { update } = useIntercom();
  useEffect(() => {
    update({ hideDefaultLauncher: isHidden });

    return () => {
      update({ hideDefaultLauncher: false });
    };
  }, [update, isHidden]);
}
