import { useState, useEffect } from 'react';
import { isNotificationsSupported } from 'utils/notifications';

export function useNotificationSupport() {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>();

  useEffect(() => {
    // Check if Notifications API is supported
    if (isNotificationsSupported()) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  async function requestPermission(): Promise<NotificationPermission | null> {
    if (isNotificationsSupported()) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      return permission;
    } else {
      return null;
    }
  }

  return {
    notificationPermission,
    requestPermission,
  };
}
