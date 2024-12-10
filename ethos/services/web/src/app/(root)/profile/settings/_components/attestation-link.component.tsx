import { type AttestationService } from '@ethos/blockchain-manager';
import Link from 'next/link';
import { type ReactNode } from 'react';
import { tokenCssVars } from 'config/theme';
import { type ExtendedAttestation } from 'hooks/user/lookup';

export function AttestationLink({
  attestation,
  linkColor = 'primary',
}: {
  attestation: ExtendedAttestation;
  linkColor?: 'primary' | 'secondary';
}): ReactNode {
  const links: Record<AttestationService, ReactNode> = {
    'x.com': (
      <Link
        href={`https://x.com/${attestation.extra?.username}`}
        target="_blank"
        css={{
          color: linkColor === 'primary' ? tokenCssVars.colorPrimary : tokenCssVars.colorText,
        }}
      >
        @{attestation.extra?.username ?? 'Unknown'}
      </Link>
    ),
  };

  return links[attestation.attestation.service] ?? <div>Not implemented!</div>;
}
