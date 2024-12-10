// TODO: use @ethos/env instead once we fix the issue with importing workspace
// packages from content.js

export const ETHOS_WEB_URL: string =
  import.meta.env.VITE_ETHOS_WEB_URL ??
  (import.meta.env.DEV ? 'https://dev.ethos.network' : 'https://sepolia.ethos.network');

export const HISTORY_STATE_UPDATED = 'HISTORY_STATE_UPDATED';
