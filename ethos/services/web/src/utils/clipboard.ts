import { App } from 'antd';
import { type NotificationInstance } from 'antd/es/notification/interface';

export function useCopyToClipboard() {
  const { notification } = App.useApp();

  return async (text: string, successMessage?: string) => {
    await copyToClipboard(notification, text, successMessage);
  };
}

const copyToClipboard = async (
  notification: NotificationInstance,
  text: string,
  successMessage?: string,
) => {
  try {
    await navigator.clipboard.writeText(text);

    if (successMessage) {
      notification.success({
        message: successMessage,
        key: 'copy-link-success',
      });
    }
  } catch (err) {
    console.error(err);
  }
};
