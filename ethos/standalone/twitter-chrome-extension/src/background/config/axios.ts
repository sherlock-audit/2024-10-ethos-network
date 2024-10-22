import axios from 'axios';
import { ETHOS_API_URL } from './constants';

/**
 * Axios client for Ethos API
 */

export const ethios = axios.create();

ethios.interceptors.request.use(
  (config) => {
    config.headers['X-Ethos-Service'] = 'twitter-chrome-extension';
    config.headers['Content-Type'] = 'application/json';

    return config;
  },
  async (error) => {
    if (import.meta.env.VITE_LOG_ENABLED) {
      // importing logger is causing out of module error in background script
      console.warn('REQUEST ERROR', error);
    }

    return await Promise.reject(error instanceof Error ? error : new Error('Request error'));
  },
);

ethios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (import.meta.env.VITE_LOG_ENABLED) {
      const pathname = String(error?.request?.url).replace(ETHOS_API_URL, '');
      console.warn(pathname, error);
    }

    return await Promise.reject(error instanceof Error ? error : new Error('Response error'));
  },
);
