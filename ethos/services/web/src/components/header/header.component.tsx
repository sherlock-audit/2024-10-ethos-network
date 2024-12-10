'use client';

import { css } from '@emotion/react';
import { Layout, Flex } from 'antd';
import Link from 'next/link';
import { useMemo } from 'react';
import { zeroAddress } from 'viem';
import { Logo, LogoFull } from '../icons';
import { CustomConnectButtonMobile } from './connect-button/connect-button-mobile.component';
import { CustomConnectButton } from './connect-button/connect-button.component';
import { InfoMenu } from './info-menu.component';
import { NavigationMenu } from './navigation-menu/navigation-menu';
import { NavigationMenuMobile } from './navigation-menu/navigation-menu-mobile';
import { Notifications } from './notifications/notifications.component';
import { Rewards } from './rewards.component';
import { SearchBar } from './search.component';
import { ThemePicker } from './theme-picker.component';
import { tokenCssVars } from 'config/theme';
import { HEADER_HEIGHT } from 'constant/constants';
import { useContributorMode } from 'contexts/contributor-mode.context';
import { useCurrentUser } from 'contexts/current-user.context';
import { useVouchRewards } from 'hooks/user/lookup';
import { hideOnMobileCSS, hideOnTabletAndAboveCSS, hideOnTabletOnlyCSS } from 'styles/responsive';

const { Header } = Layout;

export function Navigation() {
  const { connectedAddress } = useCurrentUser();
  const { isContributorModeOpen } = useContributorMode();
  const { data: vouchRewards } = useVouchRewards({ address: connectedAddress ?? zeroAddress });

  const mobileTitle = useMemo(() => {
    return (
      <Flex gap={12} flex={1} align="center" css={hideOnTabletOnlyCSS}>
        <SearchBar
          isFullWidth
          wrapperCSS={css`
            flex: 1;
            margin-left: auto;
          `}
        />
        {Number(vouchRewards?.rewards ?? 0) > 0 && <Rewards />}
        {connectedAddress && <Notifications />}
        <ThemePicker />
        <InfoMenu />
      </Flex>
    );
  }, [connectedAddress, vouchRewards?.rewards]);

  return (
    <Header
      css={css`
        position: sticky;
        height: ${HEADER_HEIGHT}px;
        top: 0;
        z-index: ${isContributorModeOpen ? 5 : 10};
      `}
    >
      <Flex
        gap={20}
        justify="space-between"
        align="center"
        css={{
          height: '100%',
        }}
      >
        <Link
          href="/"
          css={css`
            display: flex;
          `}
        >
          <Logo
            css={css`
              font-size: 32px;
              color: ${tokenCssVars.colorText};
              ${hideOnMobileCSS}
            `}
          />
          <LogoFull
            css={css`
              color: ${tokenCssVars.colorText};
              margin-left: -6px;
              ${hideOnTabletAndAboveCSS}
            `}
          />
        </Link>
        <SearchBar
          wrapperCSS={css`
            ${hideOnMobileCSS}
            @media (max-width: 1023px) and (min-width: 769px) {
              margin-right: auto;
            }
          `}
        />
        <CustomConnectButtonMobile
          wrapperCSS={css`
            margin-left: auto;
            ${hideOnTabletAndAboveCSS}
          `}
        />
        <NavigationMenu />
        <Flex align="center" gap="middle" css={hideOnMobileCSS}>
          {Number(vouchRewards?.rewards ?? 0) > 0 && <Rewards />}
          {connectedAddress && <Notifications />}
          <ThemePicker />
          <InfoMenu />
          <CustomConnectButton />
        </Flex>
        <NavigationMenuMobile title={mobileTitle} />
      </Flex>
    </Header>
  );
}
