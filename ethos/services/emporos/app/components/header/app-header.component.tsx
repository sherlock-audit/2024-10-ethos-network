import { Link, NavLink } from '@remix-run/react';
import { Layout, Flex } from 'antd';
import clsx from 'clsx';
import { LogoHeaderIcon, LogoHeaderTextIcon } from '../icons/header-logo.tsx';
import { LoginButton } from './login-button.component.tsx';
import { ThemeToggle } from './theme-toggle.component.tsx';
import { SearchBar } from '~/components/search/search.component.tsx';

const { Header } = Layout;

const navigationItems = [
  { label: 'Home', link: '/' },
  { label: 'Rewards', link: '/rewards' },
  { label: 'Holdings', link: '/holdings' },
];

export function AppHeader() {
  return (
    <Header className="hidden md:flex sticky z-10 my-auto h-16 px-4 md:px-4 lg:px-12 bg-antd-colorBgLayout">
      <Flex gap={16} justify="space-between" align="center" className="grow">
        <Flex gap={16} align="center" justify="start">
          <Link to="/" className="flex items-center justify-start gap-[15px]">
            <LogoHeaderIcon />
            <LogoHeaderTextIcon className="hidden lg:flex" />
          </Link>
          <SearchBar />
          <Flex className="flex items-center gap-7" flex={1}>
            {navigationItems?.map((item) => (
              <NavLink
                to={item.link}
                key={item.label}
                className={({ isActive }) =>
                  clsx(
                    'text-sm',
                    isActive ? 'text-antd-colorPrimary' : 'text-antd-colorTextSecondary',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </Flex>
        </Flex>
        <Flex align="center" justify="end" gap={4}>
          <ThemeToggle />
          <LoginButton />
        </Flex>
      </Flex>
    </Header>
  );
}
