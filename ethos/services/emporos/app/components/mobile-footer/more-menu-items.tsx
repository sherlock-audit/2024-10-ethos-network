import { LoadingOutlined } from '@ant-design/icons';
import { useCopyToClipboard } from '@ethos/common-ui';
import { termsOfServiceLink } from '@ethos/domain';
import { Link, type LinkProps } from '@remix-run/react';
import { Avatar, Button, Flex, Popover, type ButtonProps } from 'antd';
import clsx from 'clsx';
import { useState } from 'react';
import { AVATAR_SIZES } from '../avatar/user-avatar.component.tsx';
import { useThemeToggle } from '../header/theme-toggle.component.tsx';
import { ArticleIcon } from '../icons/article.tsx';
import { CopyContentIcon } from '../icons/copy-content.tsx';
import { LoginIcon } from '../icons/login.tsx';
import { LogoutIcon } from '../icons/logout.tsx';
import { MenuIcon } from '../icons/menu.tsx';
import { PersonIcon } from '../icons/person.tsx';
import { SettingsIcon } from '../icons/settings.tsx';
import { useMarketUser, useLoginMarketUser, useLogoutMarketUser } from '~/hooks/marketUser.tsx';

export function MoreMenuTrigger({ navItemClass }: { navItemClass: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover
      content={
        <MoreMenuItems
          closeMenu={() => {
            setIsOpen(false);
          }}
        />
      }
      trigger="click"
      arrow={false}
      rootClassName="[&_.ant-popover-inner]:p-0"
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <Button
        type="link"
        className={clsx(navItemClass, 'w-full h-auto text-antd-colorTextSecondary')}
      >
        <MenuIcon className="text-2xl leading-none" />
        More
      </Button>
    </Popover>
  );
}
export function MoreMenuItems({ closeMenu }: { closeMenu: () => void }) {
  const { isReady, wallet, user } = useMarketUser();
  const login = useLoginMarketUser();
  const logout = useLogoutMarketUser();
  const copyToClipboard = useCopyToClipboard();
  const { toggleTheme, themeIcon } = useThemeToggle();

  function onCopy() {
    if (user?.wallet?.address) {
      copyToClipboard(user.wallet.address, 'Copied wallet address');
    }
  }

  return (
    <Flex
      vertical
      align="center"
      className={clsx(
        '[&>*:not(:first-child)]:border-t [&>*:not(:first-child)]:border-t-borderDark',
      )}
    >
      {user && (
        <Link
          to={`/profile/${wallet?.address}`}
          className="px-2 py-[10px] flex items-center justify-center"
          onClick={closeMenu}
        >
          <Avatar
            src={user?.twitter?.profilePictureUrl ?? ''}
            size={AVATAR_SIZES.xs}
            icon={<PersonIcon />}
          />
        </Link>
      )}
      <MenuButton onClick={toggleTheme} title="Toggle theme">
        {themeIcon}
      </MenuButton>
      <MenuLink
        title="Terms of Service"
        to={termsOfServiceLink}
        target="_blank"
        rel="noreferrer"
        closeMenu={closeMenu}
      >
        <ArticleIcon />
      </MenuLink>
      {user && (
        <>
          <MenuLink title="Settings" to="/settings" closeMenu={closeMenu}>
            <SettingsIcon />
          </MenuLink>
          <MenuButton title="Copy address" onClick={onCopy}>
            <CopyContentIcon />
          </MenuButton>
        </>
      )}
      <MenuButton
        onClick={() => {
          if (isReady) {
            user ? logout() : login();
          }
        }}
      >
        {!isReady ? (
          <LoadingOutlined />
        ) : user ? (
          <LogoutIcon className="text-antd-colorError" />
        ) : (
          <LoginIcon />
        )}
      </MenuButton>
    </Flex>
  );
}

const menuItemClass = 'text-2xl leading-none min-w-fit h-auto p-4 rounded-none';

function MenuButton({ children, title, ...props }: ButtonProps) {
  return (
    <Button type="link" className={menuItemClass} {...props}>
      <span className="sr-only">{title}</span>
      {children}
    </Button>
  );
}

function MenuLink({ children, title, closeMenu, ...props }: LinkProps & { closeMenu: () => void }) {
  return (
    <Link className={menuItemClass} onClick={closeMenu} {...props}>
      <span className="sr-only">{title}</span>
      {children}
    </Link>
  );
}
