import { useEffect } from 'react';
import { useLocalStorage } from './use-storage';

type DeviceInfo = {
  deviceIdentifier?: string;
};

export function useDeviceInfo(): DeviceInfo {
  const [deviceIdentifier, setDeviceIdentifier] = useLocalStorage<string>(
    'device-info.device-identifier',
  );

  useEffect(() => {
    if (!deviceIdentifier) {
      setDeviceIdentifier(crypto.randomUUID());
    }
  });

  return {
    deviceIdentifier,
  };
}
