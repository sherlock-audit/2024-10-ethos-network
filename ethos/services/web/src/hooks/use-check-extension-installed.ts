import React, { useEffect } from 'react';
import { chromeExtensionId } from 'constant/links';

export function useCheckExtensionInstalled(): boolean {
  const [isInstalled, setIsInstalled] = React.useState<boolean>(false);

  useEffect(() => {
    const img = new Image();
    img.src = `chrome-extension://${chromeExtensionId}/assets/ethos-white-logo.png`;
    img.onload = () => {
      setIsInstalled(true);
    };
    img.onerror = () => {
      setIsInstalled(false);
    };
  }, []);

  return isInstalled;
}
