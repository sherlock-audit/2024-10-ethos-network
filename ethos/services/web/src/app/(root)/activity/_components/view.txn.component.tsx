import { css } from '@emotion/react';
import { Tooltip } from 'antd';
import Link from 'next/link';
import { OpenInNewIcon } from 'components/icons';
import { getEnvironment } from 'config';

const chainExplorers: Record<ReturnType<typeof getEnvironment> | 'unknown', string> = {
  local: 'https://sepolia.basescan.org/tx/',
  dev: 'https://sepolia.basescan.org/tx/',
  testnet: 'https://sepolia.basescan.org/tx/',
  prod: 'https://basescan.org/tx/',
  unknown: 'https://blockexplorer.one/?q=',
};

function isValidChain(chain: string): chain is keyof typeof chainExplorers {
  return chain in chainExplorers;
}

export function getTxnURL(txnHash: string, chain?: string) {
  if (chain) {
    if (isValidChain(chain)) {
      return `${chainExplorers[chain]}${txnHash}`;
    } else {
      return `${chainExplorers.unknown}${txnHash}`;
    }
  }

  return `${chainExplorers[getEnvironment()]}${txnHash}`;
}

export function ViewTxn({ txnHash, chain }: { txnHash: string; chain?: string }) {
  return (
    <Tooltip title="View transaction">
      <Link
        href={getTxnURL(txnHash, chain)}
        target="_blank"
        css={css`
          font-size: 16px;
        `}
      >
        <OpenInNewIcon />
      </Link>
    </Tooltip>
  );
}
