import { MenuOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { useSelectedLayoutSegment } from 'next/navigation';
import { MobileMenu } from '../mobile-menu';
import { useHeaderNavigationItems } from './use-header-navigation-items';
import { tokenCssVars } from 'config/theme';

export function NavigationMenuMobile({ title }: { title: React.ReactNode | string }) {
  const segment = useSelectedLayoutSegment();
  const navigationItems = useHeaderNavigationItems();

  return (
    <MobileMenu
      items={navigationItems}
      selectedKey={segment ?? 'home'}
      title={title}
      type="default"
      wrapperCSS={css`
        background-color: ${tokenCssVars.colorBgContainer};
      `}
      hideOnTablet={false}
      icon={<MenuOutlined />}
      itemSize="large"
    />
  );
}
