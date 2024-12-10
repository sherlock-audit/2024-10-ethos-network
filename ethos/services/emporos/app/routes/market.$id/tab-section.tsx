import { NavLink } from '@remix-run/react';
import { Flex } from 'antd';
import clsx from 'clsx';
import { motion } from 'framer-motion';

export function TabSection() {
  return (
    <Flex justify="start" gap={16}>
      <TabLink to="./">Activity</TabLink>
      <TabLink to="./holders">Holders</TabLink>
      {/* <TabLink to="./comments">Comments</TabLink> */}
    </Flex>
  );
}

function TabLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      preventScrollReset={true}
      end
      prefetch="intent"
      className={({ isActive }) =>
        clsx('relative py-2 px-1', {
          'text-antd-colorPrimary': isActive,
        })
      }
    >
      {({ isActive }) => (
        <>
          {children}
          {isActive && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-antd-colorPrimary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </>
      )}
    </NavLink>
  );
}
