'use client';

import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useCurrentUser } from './current-user.context';
import { useDeviceInfo } from 'hooks/use-device-info';
import { useNotificationSupport } from 'hooks/useNotificationSupport';
import { echoApi } from 'services/echo';
import { registerServiceWorker, initializeMessaging, onMessageListener } from 'services/firebase';
import { isNotificationsSupported, isServiceWorkerSupported } from 'utils/notifications';

export type AppNotificationsContextType = {
  messagingToken?: string;
  userProfileId?: number;
  permission?: NotificationPermission;
  requestPermission?: () => Promise<NotificationPermission | null>;
};

const AppNotificationsContext = createContext<AppNotificationsContextType>({});

export function useAppNotifications() {
  const context = useContext(AppNotificationsContext);

  if (!context) {
    throw new Error('useAppNotifications must be used within a AppNotificationsProvider');
  }

  return context;
}

export function AppNotificationsProvider({ children }: PropsWithChildren) {
  const { deviceIdentifier } = useDeviceInfo();
  const { notificationPermission, requestPermission } = useNotificationSupport();
  const [messagingToken, setMessagingToken] = useState<string>();

  const { connectedProfile } = useCurrentUser();

  const targetProfileId: number | undefined = useMemo(
    () => (connectedProfile ? connectedProfile.id : undefined),
    [connectedProfile],
  );

  useEffect(() => {
    if (targetProfileId && messagingToken && deviceIdentifier) {
      echoApi.fcm.updateUserToken({
        profileId: targetProfileId,
        token: messagingToken,
        deviceIdentifier,
      });
    }
  }, [deviceIdentifier, messagingToken, targetProfileId]);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    if (!targetProfileId || !isNotificationsSupported()) return;

    if (notificationPermission === 'granted') {
      initializeMessaging().then((token) => {
        if (token) {
          setMessagingToken(token);
          setupNotificationsListener();
        }
      });
    }
  }, [targetProfileId, notificationPermission]);

  return (
    <AppNotificationsContext.Provider
      value={{
        messagingToken,
        permission: notificationPermission,
        userProfileId: targetProfileId,
        requestPermission,
      }}
    >
      {children}
    </AppNotificationsContext.Provider>
  );
}

function setupNotificationsListener() {
  onMessageListener((payload) => {
    if (payload.data && navigator) {
      const { notificationTitle, notificationBody, notificationIcon, notificationUrl } =
        payload.data;
      navigator.serviceWorker.ready.then(function (registration) {
        registration.showNotification(notificationTitle, {
          badge: notificationIcon,
          body: notificationBody,
          icon: notificationIcon,
          data: {
            url: notificationUrl,
          },
        });
      });
    }
  });
}

export function sendTestNotification() {
  if (!isServiceWorkerSupported()) return;

  navigator.serviceWorker.ready.then((registration) => {
    registration.showNotification('Notification', {
      badge: '/assets/images/pwa/notifications/ethos-badge-icon.png',
      body: 'You have the proper permissions required to see alerts from Ethos!',
      icon: '/assets/images/pwa/notifications/ethos-badge-icon.png',
      data: {
        url: '/',
      },
    });
  });
}
