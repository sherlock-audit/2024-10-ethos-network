import { Typography } from 'antd';
import clsx from 'clsx';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { useEffect, useState } from 'react';
import { ErrorOutlineIcon } from '~/components/icons/error-outline.tsx';

const variants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    scale: 1,
  },
  exit: {
    opacity: 0,
    scale: 0.9,
  },
};

export function ErrorMessage({
  errorMessage,
  className,
}: {
  errorMessage: string | null;
  className?: string;
}) {
  const [animationKey, setAnimationKey] = useState(errorMessage);

  useEffect(() => {
    if (errorMessage) {
      setAnimationKey(errorMessage);
    }
  }, [errorMessage]);

  return (
    <AnimatePresence mode="wait" key={animationKey}>
      {errorMessage ? (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={variants}
          transition={{
            bounce: 0,
            duration: 0.2,
          }}
          className={clsx(
            'flex items-center justify-center gap-2 w-fit mx-auto',
            'text-antd-colorError py-1 px-4 rounded-100 bg-antd-colorBgLayout',
            className,
          )}
          key={animationKey}
        >
          <ErrorOutlineIcon className="text-base/none" />
          <Typography.Text className="text-sm text-inherit">{errorMessage}</Typography.Text>
        </motion.div>
      ) : (
        <motion.div className="h-[28px]" key="empty" />
      )}
    </AnimatePresence>
  );
}
