'use client';
import { css } from '@emotion/react';
import { useFeatureGate } from '@statsig/react-bindings';
import { Layout, theme } from 'antd';
import { useEffect } from 'react';
import { useCheckPendingInvitations } from '../auth/useCheckPendingInvitations';
import { Navigation } from '../header/header.component';
import { HeaderAnnouncements } from '../header-announcements/header-announcements.component';
import { tokenCssVars } from 'config/theme';
import { HEADER_HEIGHT, MAIN_LAYOUT_PADDING_BOTTOM } from 'constant/constants';
import { featureGates } from 'constant/feature-flags';
import { useThemeMode } from 'contexts/theme-manager.context'; // Updated import

const { useToken } = theme;
const { Content } = Layout;

export function MainLayout({ children }: React.PropsWithChildren) {
  const { token } = useToken();
  const mode = useThemeMode();
  const { value: isChromeExtensionBannerEnabled } = useFeatureGate(
    featureGates.chromeExtensionBanner,
  );
  useCheckPendingInvitations();
  const layoutBackground = `/assets/images/layout-background${mode === 'dark' ? '-dark' : ''}.svg`;

  useEffect(() => {
    if (window !== undefined && token.Layout?.bodyBg) {
      document.body.style.backgroundColor = token.Layout.bodyBg;
    }
  }, [token.Layout?.bodyBg]);

  return (
    <Layout
      css={css`
        @media (max-width: ${token.screenLG}px) {
          .ant-layout-header {
            padding: 0px 20px;
          }
        }
      `}
    >
      {isChromeExtensionBannerEnabled && <HeaderAnnouncements />}
      <Navigation />
      <Content
        css={css`
          padding-bottom: ${MAIN_LAYOUT_PADDING_BOTTOM}px;
          min-height: calc(${tokenCssVars.fullHeight} - ${HEADER_HEIGHT}px);
          z-index: 5;
          background-image: url(${layoutBackground});
          background-repeat: no-repeat;
          background-attachment: fixed;
          background-position: right 293px;
          position: relative;
        `}
      >
        <Content
          css={css`
            max-width: 1200px;
            padding-left: 12px;
            padding-right: 12px;
            margin: 0 auto !important;
          `}
        >
          {children}
        </Content>
      </Content>
    </Layout>
  );
}
