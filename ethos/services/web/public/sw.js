'use strict';

importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js');

const { searchParams } = new URL(self.serviceWorker.scriptURL);
const fcmConfig = JSON.parse(atob(searchParams.get('config')));

firebase.initializeApp(fcmConfig);

if (!firebase.messaging) {
  throw new Error('Firebase Messaging is not available');
}

const messaging = firebase.messaging();

// https://github.com/firebase/quickstart-js/issues/71
messaging.onBackgroundMessage((payload) => {
  if (payload.data?.notificationTitle) {
    const notificationOptions = {
      body: payload.data?.notificationBody,
      icon: payload.data?.notificationIcon,
      image: payload.data?.notificationImage,
      badge: payload.data?.notificationBadge,
      data: {
        url: payload.data?.notificationUrl,
      },
    };
    self.registration.showNotification(payload.data.notificationTitle, notificationOptions);
  }
});

self.addEventListener('push', (event) => {
  // check if the badging API is supported
  if (!navigator.setAppBadge) return;

  const message = event.data.json();
  const unreadCount = message.unreadCount;

  if (unreadCount && unreadCount > 0) {
    navigator.setAppBadge(unreadCount);
  } else {
    navigator.clearAppBadge();
  }

  if (unreadCount) {
    self.registration.showNotification(`${unreadCount} unread messages`);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    }),
  );
});
