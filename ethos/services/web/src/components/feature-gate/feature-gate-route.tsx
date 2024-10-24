import { useFeatureGate } from '@statsig/react-bindings';
import { type ReactNode, type PropsWithChildren } from 'react';
import { featureGates } from '../../constant/feature-flags';
import { NotFound } from '../error/not-found';

export function FeatureGatedPage({
  featureGate,
  children,
}: PropsWithChildren<{
  featureGate: keyof typeof featureGates;
}>): ReactNode {
  const isFeatureEnabled = useFeatureGate(featureGates[featureGate]).value;

  if (!isFeatureEnabled) {
    return <NotFound />;
  }

  return children;
}
