import { CheckCircleOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { type ActivityInfo } from '@ethos/domain';
import { Button, Card, List, Tooltip } from 'antd';
import Link from 'next/link';
import { useCallback } from 'react';
import { InvitationItem } from './invitation-item.component';
import { ReviewItem } from './review-item.component';
import { VouchItem } from './vouch-item.component';
import { tokenCssVars } from 'config';
import { useCurrentUser } from 'contexts/current-user.context';

type ContentProps = {
  onMarkAllAsRead: () => void;
  items: ActivityInfo[];
  size?: 'small' | 'default';
  title?: string | null;
  onItemClick?: () => void;
};

export function NotificationsContent({
  items,
  onMarkAllAsRead,
  size,
  title = 'Notifications',
  onItemClick,
}: ContentProps) {
  const { connectedAddress } = useCurrentUser();

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

  return (
    <Card
      size={size}
      title={title}
      extra={
        <Tooltip title="Mark all as read">
          <Button
            type="text"
            icon={
              <CheckCircleOutlined
                css={css`
                  color: ${tokenCssVars.colorSuccess};
                `}
              />
            }
            onClick={onMarkAllAsRead}
          />
        </Tooltip>
      }
      actions={[
        <Link key="view-all" href={`/profile/${connectedAddress}`}>
          View all
        </Link>,
      ]}
      css={css`
        width: ${size !== 'small' ? '480px' : undefined};
      `}
    >
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
    </Card>
  );
}
