'use client';
import { duration } from '@ethos/helpers';
import { useEffect } from 'react';
import { getAppVersion } from 'config/misc';

const LAST_CHECKED_TIME_KEY = 'ethos_app_last_checked_time';
const LATEST_APP_VERSION_KEY = 'ethos_app_version';

/**
 * A hook that checks the server for the latest app version when the browser tab becomes active.
 */
export function useVerifyLatestAppVersion(): void {
  // Fetch the current version from the API
  async function fetchLatestVersion(): Promise<string> {
    const response = await fetch('/api/version');
    const data = await response.json();

    return data.version;
  }

  useEffect(() => {
    async function getLatestVersion() {
      const currentTime = Date.now();
      const lastCheckedTime = Number(localStorage.getItem(LAST_CHECKED_TIME_KEY) ?? 0);

      if (currentTime - lastCheckedTime > duration(1, 'minute').toMilliseconds()) {
        const latestVersion = await fetchLatestVersion();
        localStorage.setItem(LAST_CHECKED_TIME_KEY, String(currentTime));
        localStorage.setItem(LATEST_APP_VERSION_KEY, latestVersion);
      }

      return localStorage.getItem(LATEST_APP_VERSION_KEY);
    }

    async function checkVersion() {
      try {
        const latestVersion = await getLatestVersion();

        if (latestVersion !== getAppVersion()) {
          console.warn('Ethos app is out of date, reloading page', latestVersion);
          // Reload the window when a new version is detected
          window.location.reload();
        }
      } catch (error) {
        console.error('Error checking version:', error);
      }
    }
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    }

    // Add event listener for visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // Remove event listener when component unmounts
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}
