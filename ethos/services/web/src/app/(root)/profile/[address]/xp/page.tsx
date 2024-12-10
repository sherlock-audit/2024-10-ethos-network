'use client';

import { useParams } from 'next/navigation';
import { useExtractAddress } from '../use-extract-address';
import { XpHistory } from './_components/xp-history.component';

export default function XpHistoryPage() {
  const params = useParams<{ address: string }>();
  const { address } = useExtractAddress(params.address);

  return <XpHistory target={{ address }} />;
}
