import { initializeApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  type MessagePayload,
  type Messaging,
  onMessage,
} from 'firebase/messaging';
import { isServiceWorkerSupported } from '../utils/notifications';
import { getFCMConfig, getFCMVapidKey } from 'config/firebase';

const fcmConfig = getFCMConfig();
const fcmVapidKey = getFCMVapidKey();

const app = initializeApp(fcmConfig);
let messaging: Messaging;

// Initialize Firebase Messaging only if the browser supports it
export async function initializeMessaging(): Promise<string | null> {
  if (isServiceWorkerSupported() && 'PushManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      messaging = getMessaging(app);
      const token = await getToken(messaging, {
        vapidKey: fcmVapidKey,
        serviceWorkerRegistration: registration,
      });

      return token;
    } catch (error) {
      console.error('Error getting FCM token', error);

      return null;
    }
  } else {
    console.warn('This browser does not support Firebase Cloud Messaging.');

    return null;
  }
}

export async function onMessageListener(callback: (payload: MessagePayload) => void) {
  onMessage(messaging, (payload) => {
    callback(payload);
  });
}

// Registers a service worker for Firebase messaging if supported by the browser
export function registerServiceWorker() {
  if (isServiceWorkerSupported()) {
    // Stringify the Firebase config and encode it in base64 so we can pass it as a query parameter
    const config = btoa(JSON.stringify(getFCMConfig()));
    const search = new URLSearchParams({ config }).toString();

    navigator.serviceWorker.register(`/sw.js?${search}`).catch((error) => {
      console.error('Service Worker registration failed:', error);
    });
  }
}
