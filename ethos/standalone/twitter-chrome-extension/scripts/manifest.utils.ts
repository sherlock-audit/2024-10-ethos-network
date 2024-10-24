import fs from 'node:fs';
import { echoUrlMap } from '@ethos/env';
import pc from 'picocolors';

export const modes = ['dev', 'prod'] as const;

export type Mode = (typeof modes)[number];
type Config = {
  echoApiUrl: string[];
};

const configMap: Record<Mode, Config> = {
  dev: {
    echoApiUrl: [echoUrlMap.local, echoUrlMap.dev],
  },
  prod: {
    echoApiUrl: [echoUrlMap.testnet],
  },
};

export function getManifest(mode: Mode, version: string): chrome.runtime.ManifestV3 {
  const config = configMap[mode];
  const icons: chrome.runtime.ManifestV3['icons'] = {
    '16': `icons/${mode}/icon16.png`,
    '48': `icons/${mode}/icon48.png`,
    '128': `icons/${mode}/icon128.png`,
  };

  const manifest: chrome.runtime.ManifestV3 = {
    manifest_version: 3,
    name: 'Ethos Twitter Extension',
    description: 'View Ethos credibility scores and data to enhance your Twitter experience.',
    version,
    version_name: mode === 'dev' ? `${version}-dev` : undefined,
    permissions: ['storage', 'webNavigation', 'activeTab'],
    host_permissions: [
      'https://x.com/*',
      'https://twitter.com/*',
      ...config.echoApiUrl.map((url) => `${url}/*`),
    ],
    icons,
    content_scripts: [
      {
        matches: ['https://x.com/*', 'https://twitter.com/*'],
        js: ['content.js'],
      },
    ],
    background: {
      service_worker: 'background.js',
    },
    action: {
      default_popup: 'index.html',
      default_icon: icons,
    },
    web_accessible_resources: [
      {
        resources: ['assets/*.png', 'fonts/*.woff2'],
        matches: ['<all_urls>'],
      },
    ],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'",
    },
  };

  return manifest;
}

export function generateManifest(mode: Mode, version: string) {
  const manifest = getManifest(mode, version);

  fs.writeFileSync('./public/manifest.json', JSON.stringify(manifest, null, 2));

  console.log(`\n✅ Manifest generated for mode: ${pc.blue(mode)}\n`);
}
