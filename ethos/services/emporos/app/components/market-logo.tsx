import { Link } from '@remix-run/react';
import { LogoIcon, LogoTextIcon } from './icons/logo.tsx';
import { cn } from '~/utils/cn.ts';

const wrapperClass = 'flex items-center justify-start gap-2 text-base';

export function MarketLogo({
  className,
  renderAsLink = false,
}: {
  className?: string;
  renderAsLink?: boolean;
}) {
  if (renderAsLink) {
    return (
      <Link to="/" className={cn(wrapperClass, className)}>
        <LogoIcon />
        <LogoTextIcon />
      </Link>
    );
  }

  return (
    <div className={cn(wrapperClass, className)}>
      <LogoIcon />
      <LogoTextIcon />
    </div>
  );
}
