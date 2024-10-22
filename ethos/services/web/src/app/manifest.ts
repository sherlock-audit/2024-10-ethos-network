import { type MetadataRoute } from 'next';
import { getPWAIconPath } from '../config';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ethos',
    short_name: 'Ethos',
    description: 'Ethos - Credibility & reputation, onchain',
    start_url: '/',
    display: 'standalone',
    background_color: '#BBBAAD',
    theme_color: '#1F2126',
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
    ],
    screenshots: [
      {
        src: '/assets/images/pwa/desktop.png',
        sizes: '2400x1260',
        type: 'image/png',
        // @ts-expect-error - missing in type. Remove this comment once the type is updated. https://github.com/vercel/next.js/issues/62161
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
        icons: [
          {
            src: getPWAIconPath('96x96'),
            sizes: '96x96',
            type: 'image/png',
          },
        ],
      },
      {
        name: 'Invite',
        description: 'Send invites to Ethos',
        url: '/invite',
        icons: [
          {
            src: getPWAIconPath('96x96'),
            sizes: '96x96',
            type: 'image/png',
          },
        ],
      },
      {
        name: 'Release notes',
        description: 'View the release notes',
        url: '/release-notes',
        icons: [
          {
            src: getPWAIconPath('96x96'),
            sizes: '96x96',
            type: 'image/png',
          },
        ],
      },
      {
        name: 'Profile settings',
        description: 'Edit your profile settings',
        url: '/profile/settings',
        icons: [
          {
            src: getPWAIconPath('96x96'),
            sizes: '96x96',
            type: 'image/png',
          },
        ],
      },
    ],
    categories: ['finance', 'utilities', 'crypto', 'social', 'social-fi'],
  };
}
