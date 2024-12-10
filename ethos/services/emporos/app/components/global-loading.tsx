import { useNavigation } from '@remix-run/react';
import clsx from 'clsx';
import * as React from 'react';

export function GlobalLoading() {
  const navigation = useNavigation();
  const active = navigation.state !== 'idle';

  const ref = React.useRef<HTMLDivElement>(null);
  const [animationComplete, setAnimationComplete] = React.useState(true);

  React.useEffect(() => {
    if (!ref.current) return;
    if (active) setAnimationComplete(false);

    Promise.allSettled(
      ref.current.getAnimations().map(async ({ finished }) => await finished),
    ).then(() => {
      if (!active) {
        setAnimationComplete(true);
      }
    });
  }, [active]);

  return (
    <div
      role="progressbar"
      aria-hidden={!active}
      aria-valuetext={active ? 'Loading' : undefined}
      className="left-0 z-50 h-[2px] animate-pulse"
    >
      <div
        ref={ref}
        className={clsx(
          'h-full bg-gradient-to-r from-antd-colorBgSolid to-antd-colorPrimary transition-all duration-500 ease-in-out',
          navigation.state === 'idle' && animationComplete && 'w-0 opacity-0 transition-none',
          navigation.state === 'submitting' && 'w-4/12',
          navigation.state === 'loading' && 'w-10/12',
          navigation.state === 'idle' && !animationComplete && 'w-full',
        )}
      />
    </div>
  );
}
