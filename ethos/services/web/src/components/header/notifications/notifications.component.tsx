import { BellOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { Badge, Button } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { zeroAddress } from 'viem';
import { useLocalStorage } from '../../../hooks/use-storage';
import { MobileMenu } from '../mobile-menu';
import { NotificationsContent } from './notifications-content.component';
import { CustomPopover } from 'components/custom-popover/custom-popover.component';
import { tokenCssVars } from 'config';
import { useCurrentUser } from 'contexts/current-user.context';
import { useThemeMode } from 'contexts/theme-manager.context';
import { useQueryAwaitDataUpdate } from 'hooks/useWaitForQueryDataUpdate';
import { useRecentActivities } from 'hooks/user/activities';
import { hideOnMobileCSS } from 'styles/responsive';

export function Notifications() {
  const [lastActivityTimestamp, setLastActivityTimestamp] = useLocalStorage<number>(
    'lastActivityTimestamp',
    0,
  );
  const [totalUnreadActivityCount, setTotalUnreadActivityCount] = useState(0);
  const { connectedAddress, connectedProfile } = useCurrentUser();
  const currentProfileId = connectedProfile?.id ?? -1;
  const [shouldClearAfterClose, setShouldClearAfterClose] = useState(true);
  const mode = useThemeMode();

  const queryResult = useRecentActivities({ address: connectedAddress ?? zeroAddress });

  const { data: activitiesData } = useQueryAwaitDataUpdate(
    queryResult,
    (data) => data.values?.[0]?.timestamp ?? 0,
    ['REVIEW_ADDED'],
  );

  const activities = (activitiesData?.values ?? []).filter(
    (item) =>
      item.timestamp > (lastActivityTimestamp ?? 0) &&
      ((item.type === 'review' && item.subject.profileId === currentProfileId) ||
        (item.type === 'invitation-accepted' &&
          item.data.inviteInfo.invitedBy === currentProfileId) ||
        (item.type === 'vouch' && item.data.subjectProfileId === currentProfileId) ||
        (item.type === 'unvouch' && item.data.subjectProfileId === currentProfileId)),
  );

  const activitiesLimit = Math.min(activities.length, 5);
  const visibleActivities = activities.slice(0, activitiesLimit);
  const [open, setOpen] = useState(false);

  const hidePopover = useCallback(() => {
    setOpen(false);
  }, []);

  const handleMarkAllAsRead = useCallback(() => {
    if (visibleActivities.length > 0) {
      setLastActivityTimestamp(visibleActivities[0]?.timestamp);
    }
  }, [visibleActivities, setLastActivityTimestamp]);

  useEffect(() => {
    setTotalUnreadActivityCount(activities.length);
  }, [activities.length]);

  return (
    <>
      <CustomPopover
        open={open}
        arrow={false}
        content={
          <NotificationsContent
            onMarkAllAsRead={handleMarkAllAsRead}
            items={visibleActivities}
            onItemClick={hidePopover}
          />
        }
        onOpenChange={(isOpen) => {
          setOpen(isOpen);

          if (isOpen && shouldClearAfterClose) {
            setShouldClearAfterClose(true);
            setTotalUnreadActivityCount(0);
          } else if (!isOpen && shouldClearAfterClose) {
            setShouldClearAfterClose(false);
            handleMarkAllAsRead();
          }
        }}
        trigger="click"
        overlayInnerStyle={{ padding: 0 }}
        css={hideOnMobileCSS}
      >
        <Button
          css={css`
            &:hover {
              ${mode === 'light' && `background-color: ${tokenCssVars.colorBgContainer};`}
            }
          `}
          icon={
            <Badge
              count={totalUnreadActivityCount > 0 ? totalUnreadActivityCount : 0}
              color={tokenCssVars.colorPrimary}
              size="small"
            >
              <BellOutlined />
            </Badge>
          }
          type="text"
        />
      </CustomPopover>
      <MobileMenu
        itemsContent={
          <NotificationsContent
            onMarkAllAsRead={handleMarkAllAsRead}
            items={visibleActivities}
            title={null}
            size="small"
          />
        }
        title="Notifications"
        icon={<BellOutlined />}
      />
    </>
  );
}
