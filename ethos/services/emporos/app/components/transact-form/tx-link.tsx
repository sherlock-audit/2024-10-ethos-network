import { blockExplorerUrlMap } from '@ethos/env';
import { shortenHash } from '@ethos/helpers';
import { Link } from '@remix-run/react';
import { useEnvironment } from '~/hooks/env.tsx';

export function TransactionLink({ hash }: { hash: string }) {
  const environment = useEnvironment();
  const baseScanUrl = blockExplorerUrlMap[environment];

  return (
    <div>
      Transaction:{' '}
      <Link
        // TODO: use dynamic URL depending whether it's on mainnet or testnet
        to={`${baseScanUrl}/tx/${hash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500"
      >
        {shortenHash(hash)}
      </Link>
    </div>
  );
}
