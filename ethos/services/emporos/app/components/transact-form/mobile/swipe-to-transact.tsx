import { Button, Skeleton } from 'antd';
import clsx from 'clsx';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import * as React from 'react';
import { useEffect } from 'react';
import { DoubleArrowRightIcon } from '~/components/icons/double-arrow-right.tsx';
import { darkTheme, lightTheme } from '~/config/theme.ts';
import { useAuthenticate } from '~/hooks/marketUser.tsx';
import { useTransactionForm } from '~/routes/market.$id/transaction-context.tsx';
import { useTheme } from '~/theme/utils.ts';

const dragOffsetX = 6;

const dragOffsetY = 5;
const dragButtonWidth = 77;
const dragButtonHeight = 50;
const containerWidth = 320;
const containerHeight = dragButtonHeight + dragOffsetY * 2;
const dragConstraintRight = containerWidth - (dragButtonWidth + dragOffsetX);

export function SwipeToTransact({ onComplete }: { onComplete: () => void }) {
  const theme = useTheme();
  const antdColors = theme === 'light' ? lightTheme : darkTheme;
  const [isComplete, setIsComplete] = React.useState(false);
  const dragX = useMotionValue(dragOffsetX);
  const { state } = useTransactionForm();

  const progress = useTransform(dragX, [dragOffsetX, dragConstraintRight], [0, 100]);
  const backgroundColor = useTransform(
    progress,
    [0, 100],
    [antdColors.token?.colorPrimary, antdColors.token?.colorSuccess],
  );

  const { isReady, authenticated, login } = useAuthenticate();

  function handleDragEnd() {
    const currentProgress = progress.get();

    if (currentProgress >= 90) {
      setIsComplete(true);
      animate(dragX, dragConstraintRight, { duration: 0.2, type: 'spring' });
      onComplete();
    } else {
      animate(dragX, dragOffsetX, { duration: 0.4, type: 'spring' });
    }
  }

  useEffect(() => {
    if (state.transactionState === 'error' || state.transactionState === 'initial') {
      setIsComplete(false);
      animate(dragX, dragOffsetX, { duration: 0.2, type: 'spring' });
    }
  }, [state.transactionState, dragX]);

  if (!isReady) {
    return (
      <Skeleton.Button
        className="w-full rounded-50"
        active
        style={{ width: containerWidth, height: containerHeight }}
      />
    );
  }

  if (!authenticated) {
    return (
      <Button
        type="primary"
        onClick={login}
        className="w-full rounded-50"
        style={{ height: containerHeight, width: containerWidth }}
      >
        Login to {state.action}
      </Button>
    );
  }

  return (
    <div
      className={clsx(
        `relative rounded-50 overflow-hidden touch-none`,
        'flex items-center justify-center bg-antd-colorBgLayout text-antd-colorTextBase',
        state.transactionState === 'pending' && 'opacity-50',
      )}
      style={{ width: containerWidth, height: containerHeight }}
    >
      Swipe to {state.action}
      <motion.div
        drag={isComplete ? false : 'x'}
        dragConstraints={{ left: dragOffsetX, right: dragConstraintRight }}
        dragElastic={0}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{
          x: dragX,
          backgroundColor,
          top: dragOffsetY,
          height: dragButtonHeight,
          width: dragButtonWidth,
        }}
        className={clsx(
          'flex items-center justify-center rounded-50 cursor-grab active:cursor-grabbing text-antd-colorBgLayout',
          `absolute left-0`,
        )}
      >
        <DoubleArrowRightIcon className="text-2xl" />
      </motion.div>
    </div>
  );
}
