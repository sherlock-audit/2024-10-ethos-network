import { useLocalStorage } from './use-storage';
import { getEnvironment } from 'config';

const environment = getEnvironment();

export function useSimplifiedXAttestation() {
  const [isSimplifiedXAttestationEnabled, setIsSimplifiedXAttestation] = useLocalStorage(
    'dev.SIMPLIFIED_X_ATTESTATION',
    false,
  );

  return {
    isSimplifiedXAttestationEnabled:
      // Allow simplified x.com attestation only in local/dev environments
      environment === 'local' || environment === 'dev' ? isSimplifiedXAttestationEnabled : false,
    setIsSimplifiedXAttestation,
  };
}
