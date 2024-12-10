import { Button, Flex, Typography } from 'antd';

import clsx from 'clsx';
import { motion } from 'motion/react';
import { useEffect } from 'react';
import { CloseIcon } from './icons/close.tsx';

const NOTIFICATION_TIMEOUT = 4000;

export function ToastMessage({
  title,
  text,
  clearNotifications,
  placement = 'bottom-left',
}: {
  title: string;
  text: string;
  clearNotifications: () => void;
  placement?: 'bottom-right' | 'bottom-left';
}) {
  useEffect(() => {
    const timeoutRef = setTimeout(() => {
      clearNotifications();
    }, NOTIFICATION_TIMEOUT);

    return () => {
      clearTimeout(timeoutRef);
    };
  }, [clearNotifications]);

  return (
    <motion.div
      layout
      initial={{ y: 15, scale: 0.9, opacity: 0 }}
      animate={{ y: 0, scale: 1, opacity: 1 }}
      exit={{ y: -25, scale: 0.9, opacity: 0 }}
      transition={{ type: 'spring' }}
      className={clsx(
        'p-4 w-80 flex items-start rounded-lg gap-2 text-sm font-medium shadow-lg bg-antd-colorBgContainer fixed z-50',
        placement === 'bottom-right' && 'bottom-10 right-6',
        placement === 'bottom-left' && 'bottom-10 left-6',
      )}
    >
      <CloseIcon className="p-1 rounded-full bg-antd-colorTextHeading text-antd-colorBgElevated flex items-center justify-center" />
      <Flex vertical gap={4}>
        <Typography.Text className="text-base">{title}</Typography.Text>
        <Typography.Text className="text-sm">{text}</Typography.Text>
      </Flex>
      <Button
        type="text"
        onClick={() => {
          clearNotifications();
        }}
        className="ml-auto mt-0.5"
      >
        <CloseIcon />
      </Button>
    </motion.div>
  );
}
