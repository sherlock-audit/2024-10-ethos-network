'use client';

import { CheckCircleOutlined, DesktopOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { Button, Card, Flex, Typography } from 'antd';
import { Permission } from 'components/icons';
import { tokenCssVars } from 'config/theme';
import { sendTestNotification, useAppNotifications } from 'contexts/app-notifications.context';

export function Notifications() {
  const { permission, requestPermission } = useAppNotifications();

  return (
    <Card>
      <Flex
        vertical
        gap={16}
        css={css`
          width: 100%;
        `}
      >
        <Flex justify="space-between" align="center" gap={10}>
          <Permission
            css={css`
              font-size: 32px;
              color: ${tokenCssVars.colorPrimary};
            `}
          />
          <Flex vertical gap={4}>
            <Typography.Text
              strong
              css={css`
                font-size: 14px;
              `}
            >
              Push notifications
            </Typography.Text>
            <Typography.Text
              type="secondary"
              css={css`
                line-height: 20px;
              `}
            >
              Get notified of new reviews, comments & score changes
            </Typography.Text>
          </Flex>
          {permission === 'granted' ? (
            <>
              <Button
                type="link"
                css={css`
                  color: ${tokenCssVars.colorPrimary};
                `}
                onClick={sendTestNotification}
              >
                Test
              </Button>
              <Button
                ghost
                css={css`
                  color: ${tokenCssVars.colorSuccess};
                  cursor: default;
                  background: ${tokenCssVars.colorBgLayout};
                  &:hover {
                    color: ${tokenCssVars.colorSuccess} !important;
                    border-color: transparent !important;
                  }
                `}
                icon={<CheckCircleOutlined />}
                iconPosition="end"
              >
                Enabled
              </Button>
            </>
          ) : (
            <Button type="primary" onClick={requestPermission} icon={<DesktopOutlined />}>
              Enable
            </Button>
          )}
        </Flex>

        <hr
          css={css`
            width: calc(100% + 38px);
            margin: 0 -19px;
            border: none;
            border-top: 1px solid ${tokenCssVars.colorTextQuaternary};
          `}
        />

        <Typography.Text>Other devices:</Typography.Text>
        <Typography.Text type="secondary">Coming soon.</Typography.Text>
      </Flex>
    </Card>
  );
}
