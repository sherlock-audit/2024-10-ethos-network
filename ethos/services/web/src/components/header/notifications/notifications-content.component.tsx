import { CheckCircleOutlined, DesktopOutlined, SettingOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { type ActivityInfo } from '@ethos/domain';
import { Button, Card, Flex, List, Tooltip, Typography, theme } from 'antd';
import Link from 'next/link';
import { useCallback } from 'react';
import { InvitationItem } from './invitation-item.component';
import { ReviewItem } from './review-item.component';
import { VouchItem } from './vouch-item.component';
import { Permission } from 'components/icons';
import { tokenCssVars } from 'config/theme';
import { useAppNotifications } from 'contexts/app-notifications.context';
import { useCurrentUser } from 'contexts/current-user.context';

type ContentProps = {
  onMarkAllAsRead: () => void;
  items: ActivityInfo[];
  size?: 'small' | 'default';
  title?: string | null;
  onItemClick?: () => void;
};

const { useToken } = theme;

export function NotificationsContent({
  items,
  onMarkAllAsRead,
  size,
  title = 'Notifications',
  onItemClick,
}: ContentProps) {
  const { connectedAddress } = useCurrentUser();
  const { token } = useToken();

  const renderItem = useCallback(
    (item: ActivityInfo) => {
      switch (item.type) {
        case 'review':
          return <ReviewItem review={item.data} onItemClick={onItemClick} />;
        case 'vouch':
        case 'unvouch':
          return <VouchItem action={item.type} vouch={item.data} onItemClick={onItemClick} />;
        case 'invitation-accepted':
          return <InvitationItem profile={item.data} onItemClick={onItemClick} />;
        default:
          return null;
      }
    },
    [onItemClick],
  );

  const { permission, requestPermission } = useAppNotifications();

  return (
    <Card
      size={size}
      title={title}
      extra={
        <>
          <Tooltip title="Mark all as read">
            <Button type="text" icon={<CheckCircleOutlined />} onClick={onMarkAllAsRead} />
          </Tooltip>
          <Tooltip title="Notification settings">
            <Link href="/profile/settings?tab=notifications">
              <Button type="text" icon={<SettingOutlined />} />
            </Link>
          </Tooltip>
        </>
      }
      css={css`
        width: ${size !== 'small' ? '480px' : undefined};
      `}
    >
      <Flex vertical gap={token.paddingMD}>
        <List
          dataSource={items}
          itemLayout="horizontal"
          locale={{ emptyText: 'No new notifications' }}
          renderItem={renderItem}
          css={css`
            & .ant-list-item {
              margin-left: 0;
            }
          `}
        />
        <Flex align="center" justify="center">
          <Link key="view-all" href={`/profile/${connectedAddress}`}>
            View all
          </Link>
        </Flex>
        {permission !== 'granted' && (
          <div
            css={css`
              background: ${tokenCssVars.colorBgElevated};
              padding: ${token.padding}px;
              border-radius: 0 0 ${token.borderRadius}px ${token.borderRadius}px;
              margin: 0 -${token.padding}px -${token.padding}px;
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
                <Typography.Text strong>Push notifications</Typography.Text>
                <Typography.Text
                  type="secondary"
                  css={css`
                    line-height: 20px;
                  `}
                >
                  Get notified of new reviews, comments & score changes
                </Typography.Text>
              </Flex>
              <Button type="primary" onClick={requestPermission}>
                <DesktopOutlined />
                Enable
              </Button>
            </Flex>
          </div>
        )}
      </Flex>
    </Card>
  );
}
