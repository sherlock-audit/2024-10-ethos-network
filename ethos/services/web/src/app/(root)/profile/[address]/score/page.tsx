'use client';

import { useParams } from 'next/navigation';
import { useExtractAddress } from '../use-extract-address';
import { ScoreExplainer } from './_components/score.components';

export default function Page() {
  const params = useParams<{ address: string }>();
  const { address } = useExtractAddress(params.address);

  return <ScoreExplainer target={{ address }} />;
}
