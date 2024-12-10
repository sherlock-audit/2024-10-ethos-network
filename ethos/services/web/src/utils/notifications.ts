export function isNotificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function isServiceWorkerSupported() {
  return typeof window !== 'undefined' && 'navigator' in window && 'serviceWorker' in navigator;
}
