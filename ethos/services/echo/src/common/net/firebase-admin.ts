import { type ProfileId } from '@ethos/blockchain-manager';
import { notEmpty } from '@ethos/helpers';
import FirebaseAdmin from 'firebase-admin';
import { FirebaseMessagingError } from 'firebase-admin/messaging';
import { prisma } from '../../data/db.js';
import { config } from '../config.js';
import { rootLogger } from '../logger.js';
import { FEATURE_GATES, getGlobalFeatureGate } from '../statsig.js';

const logger = rootLogger.child({ module: 'firebase-admin' });

FirebaseAdmin.initializeApp({
  credential: FirebaseAdmin.credential.cert(config.FIREBASE_ADMIN_CREDENTIALS),
});

export type NotificationPayload = {
  title: string;
  body: string;
  image?: string;
  badge?: string;
  icon?: string;
  url?: string;
};

export async function hasAssociatedTokens(profileId: number): Promise<boolean> {
  const tokenCount = await prisma.userFcmToken.count({
    where: { profileId },
  });

  return tokenCount > 0;
}

export async function fetchProfileTokens(profileId: number): Promise<string[]> {
  const profileTokens = await prisma.userFcmToken.findMany({
    where: { profileId },
  });

  return profileTokens.map((profileToken) => profileToken.fcmToken);
}

export async function sendNotification(
  token: string,
  payload: NotificationPayload,
  profileId: ProfileId,
): Promise<string | null> {
  const data: Record<string, string> = {
    notificationTitle: payload.title,
    notificationBody: payload.body,
  };

  if (payload.icon) {
    data.notificationIcon = payload.icon;
  }
  if (payload.image) {
    data.notificationImage = payload.image;
  }
  if (payload.url) {
    data.notificationUrl = payload.url;
  }
  if (payload.badge) {
    data.notificationBadge = payload.badge;
  }

  try {
    const messageId = await FirebaseAdmin.messaging().send({
      token,
      data,
    });

    logger.info({ data: { profileId, messageId } }, 'firebase-admin.sendNotification_success');

    return messageId;
  } catch (err) {
    if (
      err instanceof FirebaseMessagingError &&
      err.code !== 'messaging/invalid-registration-token' &&
      err.code !== 'messaging/registration-token-not-registered'
    ) {
      logger.warn({ err, data: { profileId } }, 'firebase-admin.sendNotification_failed');
    } else {
      logger.info({ err, data: { profileId } }, 'firebase-admin.sendNotification_invalid_token');
    }

    return null;
  }
}

export async function sendNotificationByProfileId(
  profileId: number,
  payload: NotificationPayload,
  forceSend: boolean = false,
): Promise<string[]> {
  const isNotificationsEnabled = forceSend || getGlobalFeatureGate(FEATURE_GATES.PWA_NOTIFICATIONS);

  if (!isNotificationsEnabled) {
    logger.info('firebase-admin.notifications_disabled');

    return [];
  }

  const tokens = await fetchProfileTokens(profileId);

  if (tokens.length === 0) {
    logger.warn({ data: { profileId } }, 'firebase-admin.no_fcm_token_for_profile');

    return [];
  }

  return (
    await Promise.all(
      tokens.map(async (token) => await sendNotification(token, payload, profileId)),
    )
  ).filter(notEmpty);
}
