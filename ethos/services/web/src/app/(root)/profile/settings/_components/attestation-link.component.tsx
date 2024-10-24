import { type AttestationService } from '@ethos/blockchain-manager';
import Link from 'next/link';
import { type ReactNode } from 'react';
import { type ExtendedAttestation } from 'hooks/user/lookup';

export function AttestationLink({ attestation }: { attestation: ExtendedAttestation }): ReactNode {
  const links: Record<AttestationService, ReactNode> = {
    'x.com': (
      <Link href={`https://x.com/${attestation.extra?.username}`} target="_blank">
        @{attestation.extra?.username ?? 'Unknown'}
      </Link>
    ),
  };

  return links[attestation.attestation.service] ?? <div>Not implemented!</div>;
}
