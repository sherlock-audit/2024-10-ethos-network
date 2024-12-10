import { blockExplorerUrlMap } from '@ethos/env';
import { Link } from '@remix-run/react';
import { OpenInNewIcon } from '../icons/open-in-new.tsx';
import { useEnvironment } from '~/hooks/env.tsx';

export function TransactionIcon({ hash, className }: { hash: string; className?: string }) {
  const environment = useEnvironment();
  const baseScanUrl = blockExplorerUrlMap[environment];

  return (
    <Link
      to={`${baseScanUrl}/tx/${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      <span className="sr-only">View transaction</span>
      <OpenInNewIcon />
    </Link>
  );
}
