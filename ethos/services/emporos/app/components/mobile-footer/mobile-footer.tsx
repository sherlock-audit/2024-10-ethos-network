import { NavLink } from '@remix-run/react';
import clsx from 'clsx';
import { GlobalLoading } from '../global-loading.tsx';
import { EthosStarIcon } from '../icons/ethos-star.tsx';
import { HandCoinIcon } from '../icons/hand-coin.tsx';
import { IntersectIcon } from '../icons/intersect.tsx';
import { SearchIcon } from '../icons/search.tsx';
import { MoreMenuTrigger } from './more-menu-items.tsx';

const footerItems = [
  {
    key: 'home',
    label: 'Home',
    icon: <IntersectIcon />,
    link: '/',
  },
  {
    key: 'rewards',
    label: 'Rewards',
    icon: <EthosStarIcon />,
    link: '/rewards',
  },
  {
    key: 'search',
    label: 'Search',
    icon: <SearchIcon />,
    link: '/search',
  },
  {
    key: 'holdings',
    // TODO: Replace with actual balance
    label: '2.41e',
    icon: <HandCoinIcon />,
    link: '/holdings',
  },
];

const navItemClass = 'flex flex-col items-center gap-[2px] text-xs py-4 px-2 flex-1';

export function MobileFooter() {
  return (
    <nav className="fixed md:hidden bottom-0 inset-x-0 pb-[calc(env(safe-area-inset-bottom)/2)] px-safe bg-antd-colorBgContainer shadow-mobileFooter">
      <GlobalLoading />
      <ul className="p-0 flex justify-stretch items-end list-none m-0 [&>li]:flex-1">
        {footerItems.map((item) => (
          <li key={item.key}>
            <NavLink
              to={item.link}
              className={({ isActive }) =>
                clsx(
                  navItemClass,
                  isActive && 'text-antd-colorPrimary',
                  !isActive && 'text-antd-colorTextSecondary',
                )
              }
            >
              <span className="text-2xl leading-none">{item.icon}</span>
              {item.label}
            </NavLink>
          </li>
        ))}
        <li>
          <MoreMenuTrigger navItemClass={navItemClass} />
        </li>
      </ul>
    </nav>
  );
}
