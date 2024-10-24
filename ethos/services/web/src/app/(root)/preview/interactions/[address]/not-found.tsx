'use client';

import { isValidEnsName } from '@ethos/helpers';
import { useParams } from 'next/navigation';
import { NotFound } from 'components/error/not-found';

export default function NotFoundPage() {
  const { address } = useParams<{ address: string }>();
  const description = isValidEnsName(address)
    ? `Address not found for ENS: "${address}"`
    : `Invalid address: "${address}"`;

  return <NotFound description={description} />;
}
