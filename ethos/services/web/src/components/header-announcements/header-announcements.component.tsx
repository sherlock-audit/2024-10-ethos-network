import { css } from '@emotion/react';
import { Alert, Button, theme } from 'antd';
import { OpenInNewIcon } from '../icons';
import { lightTheme, tokenCssVars } from 'config/theme';
import { chromeExtensionLink } from 'constant/links';
import { useLocalStorage } from 'hooks/use-storage';

export function HeaderAnnouncements() {
  const { token } = theme.useToken();
  const [isChromeBannerDismissed, setIsChromeBannerDismissed] = useLocalStorage(
    'chrome-extension-announcement.dismissed',
    false,
  );

  if (isChromeBannerDismissed === undefined || isChromeBannerDismissed) return null;

  // FYI: We locally override colors here because it's not often that we use
  // primary color as a background, only in specific alerts like this one.
  // Fortunately it's the same color between darkmode and lightmode, #CBCBC2
  const colorBgContainer = lightTheme.token.colorBgContainer;

  return (
    <Alert
      message="Want to see Ethos scores while using Twitter?"
      description="Credibility scores for every Twitter user, seamlessly integrated into Twitter via our
          Chrome extension."
      banner
      type="info"
      showIcon={false}
      closable
      onClose={() => {
        setIsChromeBannerDismissed(true);
      }}
      css={css`
        background-color: ${tokenCssVars.colorPrimary};
        background-image: url('/assets/images/announcements/chrome_banner_logo.svg');
        background-repeat: no-repeat;
        background-position: -30px 50%;
        padding-top: ${token.padding}px;
        padding-bottom: ${token.padding}px;
        box-shadow:
          0px 6px 16px 0px rgba(0, 0, 0, 0.08),
          0px 3px 6px -4px rgba(0, 0, 0, 0.12),
          0px 9px 28px 8px rgba(0, 0, 0, 0.05);
        z-index: 11;

        &.ant-alert.ant-alert-info .anticon {
          color: inherit;
        }

        & .ant-alert-message {
          color: ${colorBgContainer};
        }

        & .ant-alert-description {
          color: ${colorBgContainer};
        }

        & .ant-alert-close-icon {
          color: ${colorBgContainer};
          font-size: 16px;
          padding-top: 13px;
        }

        @media (max-width: ${token.screenMD}px) {
          flex-wrap: wrap;
          gap: 16px;
          & .ant-alert-message {
            font-weight: 800;
          }

          & .ant-alert-message,
          & .ant-alert-description {
            font-size: 12px;
            line-height: 20px;
          }

          & .ant-alert-action {
            margin: 0px;
            order: 3; // This will make button wrap to the next line
            width: 100%;
          }

          & .ant-alert-close-icon {
            padding-top: 0px;
          }
        }
      `}
      action={
        // Override of 6px lines it up with the rainbowkit below it.
        <Button
          size="large"
          ghost
          target="_blank"
          href={chromeExtensionLink}
          icon={<OpenInNewIcon />}
          css={css`
            color: ${colorBgContainer};
            border-color: ${colorBgContainer};
            margin-right: 6px;
          `}
        >
          Get the extension
        </Button>
      }
    />
  );
}
