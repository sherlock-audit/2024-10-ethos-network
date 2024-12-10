import { baseDarkTheme, useCopyToClipboard } from '@ethos/common-ui';
import { termsOfServiceLink } from '@ethos/domain';
import { formatEth } from '@ethos/helpers';
import { Link, NavLink } from '@remix-run/react';
import { Avatar, Button, Dropdown, Flex, Skeleton, Tooltip } from 'antd';
import clsx from 'clsx';
import { getAddress, zeroAddress } from 'viem';
import { useBalance } from 'wagmi';
import { AVATAR_SIZES } from '../avatar/user-avatar.component.tsx';
import { LogoIcon } from '../icons/logo.tsx';
import { PersonIcon } from '../icons/person.tsx';
import { ArticleIcon } from '~/components/icons/article.tsx';
import { CaretDownIcon } from '~/components/icons/caret-down.tsx';
import { CopyContentIcon } from '~/components/icons/copy-content.tsx';
import { LogoutIcon } from '~/components/icons/logout.tsx';
import { SettingsIcon } from '~/components/icons/settings.tsx';
import { WalletIcon } from '~/components/icons/wallet.tsx';
import { useHoldingsBalanceByAddress } from '~/hooks/market.tsx';
import { useLoginMarketUser, useLogoutMarketUser, useMarketUser } from '~/hooks/marketUser.tsx';

const iconClass = 'text-xl leading-none';

export function LoginButton() {
  const { isReady, wallet, user } = useMarketUser();
  const login = useLoginMarketUser();
  const logout = useLogoutMarketUser();
  const copyToClipboard = useCopyToClipboard();

  if (isReady && !user) {
    return (
      <Button
        type="primary"
        onClick={() => {
          login();
        }}
      >
        Login
      </Button>
    );
  }

  return (
    <Dropdown
      menu={{
        items: [
          {
            label: (
              <NavLink
                to={`/profile/${wallet?.address}`}
                className={({ isActive }) =>
                  clsx('flex items-center gap-2', isActive && 'text-antd-colorPrimary')
                }
              >
                <Avatar
                  src={user?.twitter?.profilePictureUrl ?? ''}
                  size={AVATAR_SIZES.xxs}
                  icon={<PersonIcon />}
                />
                <span className="text-xs truncate max-w-[116px]">{`@${user?.twitter?.username}`}</span>
              </NavLink>
            ),
            key: 'profile',
          },
          {
            key: 'terms-and-conditions',
            label: (
              <Link to={termsOfServiceLink} target="_blank" rel="noreferrer">
                Terms of Service
              </Link>
            ),
            icon: <ArticleIcon className={iconClass} />,
          },
          {
            label: (
              <NavLink
                to="/settings"
                className={({ isActive }) => (isActive ? 'text-antd-colorPrimary' : '')}
              >
                Settings
              </NavLink>
            ),
            key: 'settings',
            icon: <SettingsIcon className={iconClass} />,
          },
          {
            label: 'Wallet address',
            key: 'copy-wallet',
            icon: <CopyContentIcon className={iconClass} />,
            onClick: async () => {
              if (!wallet?.address) {
                return;
              }
              await copyToClipboard(wallet.address, 'Address successfully copied');
            },
          },
          {
            label: 'Logout',
            key: 'logout',
            icon: <LogoutIcon className={iconClass} />,
            style: {
              color: baseDarkTheme.token.colorError,
            },
            onClick: () => {
              logout();
            },
          },
        ],
        style: {
          width: 180,
          float: 'right',
        },
      }}
      placement="bottomRight"
      trigger={['click']}
    >
      <Button
        className="transition-all duration-200 h-10 rounded-lg py-0 border-none bg-antd-colorBgElevated"
        disabled={!isReady}
      >
        <Flex
          className="font-semibold h-full flex items-center justify-center"
          align="center"
          justify="center"
          gap={8}
        >
          <WalletBalance />
          <HoldingsBalance />
        </Flex>
        <Flex
          gap={4}
          className="h-full flex items-center justify-center pl-2 border-solid border-l border-0 border-antd-colorBgBase"
          align="center"
          justify="center"
        >
          <Avatar src={user?.twitter?.profilePictureUrl} size={20} icon={<PersonIcon />} />
          <CaretDownIcon />
        </Flex>
      </Button>
    </Dropdown>
  );
}

function WalletBalance() {
  const { isReady, wallet } = useMarketUser();
  const { data: balance, isPending } = useBalance({
    address: getAddress(wallet?.address ?? zeroAddress),
  });

  if (!isReady || !wallet || isPending) {
    return <Skeleton.Button active shape="square" size="small" />;
  }

  return (
    <Tooltip title="Wallet balance">
      <WalletIcon />{' '}
      <span>
        {formatEth(balance?.value ?? 0n, 'wei', {
          maximumFractionDigits: 2,
        })}
      </span>
    </Tooltip>
  );
}

export function HoldingsBalance() {
  const { isReady, wallet } = useMarketUser();
  const balance = useHoldingsBalanceByAddress(wallet?.address);

  if (!isReady || !wallet) {
    return <Skeleton.Button active shape="square" size="small" />;
  }

  return (
    <Tooltip title="Holdings">
      <LogoIcon className="text-xs" />{' '}
      {formatEth(balance?.totalValue ?? 0n, 'wei', { maximumFractionDigits: 2 })}
    </Tooltip>
  );
}
