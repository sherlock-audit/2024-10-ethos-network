import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import {
  type NotificationPayload,
  sendNotification,
  sendNotificationByProfileId,
} from '../../services/echo/src/common/net/firebase-admin';

async function main(): Promise<void> {
  const argv = yargs(hideBin(process.argv))
    .option('profileId', {
      type: 'number',
      description: 'The user profile id',
    })
    .option('token', {
      type: 'string',
      description: 'The user FCM token',
    })
    .check((argv) => {
      if (!argv.profileId && !argv.token) {
        throw new Error('You must provide either --profileId or --token');
      }

      return true;
    })
    .parseSync();

  const payload: NotificationPayload = {
    title: 'Review received',
    body: 'You have received a positive review from doganyilmaz623.eth.fuel',
    icon: 'https://i.postimg.cc/PJXXV8Bf/EDITER.png',
    badge: 'https://i.postimg.cc/PJXXV8Bf/EDITER.png',
    url: 'https://sepolia.ethos.network/activity/review/4448/rc',
  };

  if (argv.profileId) {
    await sendNotificationByProfileId(argv.profileId, payload, true);
  } else if (argv.token) {
    await sendNotification(argv.token, payload, -1);
  }
}

void main();
