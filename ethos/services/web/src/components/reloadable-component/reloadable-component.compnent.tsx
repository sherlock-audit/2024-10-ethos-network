'use client';
import * as Sentry from '@sentry/nextjs';
import { ComponentErrorBoundary } from 'components/error/error-boundary';

type ReloadableComponentProps = {
  children: React.ReactNode;
};

export function ReloadableComponent({ children }: ReloadableComponentProps) {
  return <Sentry.ErrorBoundary fallback={ComponentErrorBoundary}>{children}</Sentry.ErrorBoundary>;
}
