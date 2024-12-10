import { type LoaderFunction } from '@remix-run/node';
import { type WebAppManifest, type ImageResource } from 'web-app-manifest';
import { config } from '../config/config.server.ts';
import { getPWAIconPath } from '../config/meta.ts';

type PwaManifest = WebAppManifest & {
  // Missing from types package, but valid:
  // https://www.w3.org/TR/manifest-app-info/#form_factor-member
  screenshots?: Array<ImageResource & { form_factor?: string }>;
};
const webManifest: PwaManifest = {
  name: 'Ethos.markets | Reputation markets for crypto participants.',
  short_name: 'Ethos.markets',
  description: 'Reputation markets for crypto participants.',
  start_url: '/',
  display: 'standalone',
  background_color: '#232320',
  theme_color: '#232320',
  icons: [
    {
      src: getPWAIconPath(config.ETHOS_ENV, '96x96'),
      sizes: '96x96',
      type: 'image/png',
    },
    {
      src: getPWAIconPath(config.ETHOS_ENV, '192x192'),
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: getPWAIconPath(config.ETHOS_ENV, '512x512'),
      sizes: '512x512',
      type: 'image/png',
    },
    {
      src: getPWAIconPath(config.ETHOS_ENV, '512x512', true),
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
};

// eslint-disable-next-line func-style
export const loader: LoaderFunction = () => {
  return new Response(JSON.stringify(webManifest), {
    headers: {
      'Cache-Control': 'public, max-age=600',
      'Content-Type': 'application/manifest+json',
    },
  });
};
