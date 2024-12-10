import {
  AuditOutlined,
  ChromeOutlined,
  FireOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { css } from '@emotion/react';
import { useFeatureGate } from '@statsig/react-bindings';
import { Button, Dropdown, type MenuProps } from 'antd';
import Link from 'next/link';
import { useRef } from 'react';
import { MobileMenu } from './mobile-menu';
import { tokenCssVars } from 'config/theme';
import { featureGates } from 'constant/feature-flags';
import {
  chromeExtensionLink,
  ethosHelpLink,
  privacyPolicyLink,
  termsOfServiceLink,
} from 'constant/links';
import { useThemeMode } from 'contexts/theme-manager.context';
import { hideOnMobileCSS } from 'styles/responsive';

export function InfoMenu() {
  const { value: isChromeExtensionBannerEnabled } = useFeatureGate(
    featureGates.chromeExtensionBanner,
  );
  const dropdownRef = useRef<HTMLAnchorElement>(null);

  function handleButtonClick() {
    dropdownRef.current?.click();
  }
  const mode = useThemeMode();

  const items: MenuProps['items'] = [
    {
      key: 'release-notes',
      label: <Link href="/release-notes">What&apos;s new</Link>,
      icon: <FireOutlined />,
    },
    ...(isChromeExtensionBannerEnabled
      ? [
          {
            label: (
              <Link href={chromeExtensionLink} target="_blank">
                Get the Chrome extension
              </Link>
            ),
            key: 'get-chrome',
            icon: <ChromeOutlined />,
          },
        ]
      : []),
    {
      label: (
        <Link href={ethosHelpLink} target="_blank">
          Help
        </Link>
      ),
      icon: <QuestionCircleOutlined />,
      key: 'help',
    },
    {
      label: (
        <Link href={privacyPolicyLink} target="_blank">
          Privacy Policy
        </Link>
      ),
      icon: <SafetyOutlined />,
      key: 'privacy-policy',
    },
    {
      label: (
        <Link href={termsOfServiceLink} target="_blank">
          Terms of Service
        </Link>
      ),
      icon: <AuditOutlined />,
      key: 'terms-of-service',
    },
  ];

  return (
    <>
      <Button
        type="text"
        onClick={handleButtonClick}
        css={css`
          padding: 4px 0px 4px 0px;
          width: 32px;
          &:hover {
            ${mode === 'light' && `background-color: ${tokenCssVars.colorBgContainer};`}
          }
          ${hideOnMobileCSS}
        `}
      >
        <Dropdown
          menu={{
            items,
          }}
          placement="bottom"
        >
          <a
            ref={dropdownRef}
            onClick={(e) => {
              e.preventDefault();
            }}
          >
            <InfoCircleOutlined />
          </a>
        </Dropdown>
      </Button>

      <MobileMenu items={items} title="Info" icon={<InfoCircleOutlined />} />
    </>
  );
}
