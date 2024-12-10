import { type MetadataRoute } from 'next';
import { getEnvironment } from 'config/environment';
import { getPWAIconPath } from 'config/misc';
import { darkTheme } from 'config/theme';

export default function manifest(): MetadataRoute.Manifest {
  const environment = getEnvironment();
  const name = environment === 'prod' ? 'Ethos' : `Ethos (${environment})`;

  return {
    name,
    short_name: name,
    description: 'Ethos - Credibility & reputation, onchain',
    start_url: '/',
    display: 'standalone',
    background_color: darkTheme.token.colorBgBase,
    theme_color: darkTheme.token.colorBgBase,
    icons: [
      {
        src: getPWAIconPath('192x192'),
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: getPWAIconPath('512x512'),
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: getPWAIconPath('512x512', true),
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [
      {
        src: '/assets/images/pwa/desktop.png',
        sizes: '2400x1260',
        type: 'image/png',
        form_factor: 'wide',
      },
      {
        src: '/assets/images/pwa/mobile.png',
        sizes: '804x1748',
        type: 'image/png',
      },
    ],
    shortcuts: [
      {
        name: 'Vouch balances',
        description: 'View your vouch balances',
        url: '/profile/vouches',
        icons: [{ src: getPWAIconPath('96x96'), sizes: '96x96', type: 'image/png' }],
      },
      {
        name: 'Invite',
        description: 'Send invites to Ethos',
        url: '/invite',
        icons: [{ src: getPWAIconPath('96x96'), sizes: '96x96', type: 'image/png' }],
      },
      {
        name: 'Release notes',
        description: 'View the release notes',
        url: '/release-notes',
        icons: [{ src: getPWAIconPath('96x96'), sizes: '96x96', type: 'image/png' }],
      },
      {
        name: 'Settings',
        description: 'Edit your profile settings',
        url: '/profile/settings',
        icons: [{ src: getPWAIconPath('96x96'), sizes: '96x96', type: 'image/png' }],
      },
    ],
    categories: ['finance', 'utilities', 'crypto', 'social', 'social-fi'],
  };
}
