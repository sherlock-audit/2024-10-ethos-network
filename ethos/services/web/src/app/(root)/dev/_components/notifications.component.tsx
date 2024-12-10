import { InfoCircleOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { Button, Card, Flex, Tooltip, Typography } from 'antd';
import { getEnvironment } from 'config/environment';
import {
  type AppNotificationsContextType,
  sendTestNotification,
  useAppNotifications,
} from 'contexts/app-notifications.context';
import { isNotificationsSupported } from 'utils/notifications';

const { Text } = Typography;

const environment = getEnvironment();

function NotificationPermission({
  requestPermission,
  permission,
}: Pick<AppNotificationsContextType, 'permission' | 'requestPermission'>) {
  if (permission === 'granted') {
    return <Text type="success">Granted</Text>;
  }

  if (permission === 'default') {
    return (
      <Button onClick={requestPermission} size="small">
        Request permission
      </Button>
    );
  }

  return (
    <Text type="danger">
      <Flex gap={4} align="center">
        Denied
        <Tooltip title="You have denied notifications permissions. Please enable notifications from your browser/device settings to stay updated on the latest activities in Ethos.">
          <InfoCircleOutlined
            css={css`
              opacity: 0.55;
            `}
          />
        </Tooltip>
      </Flex>
    </Text>
  );
}

function FirebasePanel({
  messagingToken,
  userProfileId,
}: Pick<AppNotificationsContextType, 'messagingToken' | 'userProfileId'>) {
  return (
    <>
      <Flex justify="space-between">
        <Text strong>FCM token</Text>
        <Text
          ellipsis
          code={messagingToken !== undefined}
          copyable={messagingToken !== undefined}
          css={css`
            max-width: 200px;
          `}
        >
          {messagingToken ?? 'No token available'}
        </Text>
      </Flex>
      <Flex justify="space-between">
        <Text strong>Profile id</Text>
        <Text copyable code>
          {userProfileId ?? '-'}
        </Text>
      </Flex>
    </>
  );
}

export function Notifications() {
  const { messagingToken, permission, requestPermission, userProfileId } = useAppNotifications();

  return (
    <Card title="Notifications">
      <Flex vertical gap={20}>
        <Flex justify="space-between">
          <Text strong>Device compatibility</Text>
          <Text type={isNotificationsSupported() ? 'success' : 'danger'}>
            {isNotificationsSupported() ? 'Compatible' : 'Not compatible'}
          </Text>
        </Flex>

        {isNotificationsSupported() && (
          <Flex justify="space-between" align="baseline">
            <Text strong>Notification permission</Text>
            <NotificationPermission permission={permission} requestPermission={requestPermission} />
          </Flex>
        )}

        {isNotificationsSupported() && permission === 'granted' && (
          <Flex justify="space-between" align="baseline">
            <Text strong>Notification permission</Text>
            <Button onClick={sendTestNotification} size="small">
              Test notification
            </Button>
          </Flex>
        )}

        {(environment === 'local' || environment === 'dev') && (
          <FirebasePanel messagingToken={messagingToken} userProfileId={userProfileId} />
        )}
      </Flex>
    </Card>
  );
}
