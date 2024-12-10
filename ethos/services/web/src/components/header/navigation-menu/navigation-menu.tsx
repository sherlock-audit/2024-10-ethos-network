import { css } from '@emotion/react';
import { Menu } from 'antd';
import { useSelectedLayoutSegment } from 'next/navigation';
import { useHeaderNavigationItems } from './use-header-navigation-items';
import { hideOnBelowDesktopCSS } from 'styles/responsive';

export function NavigationMenu() {
  const segment = useSelectedLayoutSegment();
  const navigationItems = useHeaderNavigationItems();

  return (
    <Menu
      selectedKeys={[segment ?? 'home']}
      mode="horizontal"
      items={navigationItems}
      css={css`
        flex: auto;
        min-width: 0;
        ${hideOnBelowDesktopCSS}
      `}
    />
  );
}
