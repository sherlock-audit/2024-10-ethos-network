export function getPWAIconPath(
  environment: string,
  size: '96x96' | '192x192' | '512x512',
  isMaskable = false,
) {
  const path = '/assets/icons/pwa';
  const iconName = isMaskable ? 'icon-maskable' : 'icon';

  switch (environment) {
    case 'local':
      return `${path}/${iconName}-local-${size}.png`;
    case 'dev':
      return `${path}/${iconName}-dev-${size}.png`;
    default:
      return `${path}/${iconName}-${size}.png`;
  }
}

export function getAppleTouchIconPath(environment: string, size: '57x57' | '180x180') {
  const path = '/assets/icons/apple-touch';

  switch (environment) {
    case 'local':
      return `${path}/icon-local-${size}.png`;
    case 'dev':
      return `${path}/icon-dev-${size}.png`;
    default:
      return `${path}/icon-${size}.png`;
  }
}

export function getFaviconPath(environment: string, type: 'ico' | 'svg' = 'ico') {
  const path = '/assets/icons/favicon';
  const extension = type === 'svg' ? 'svg' : 'ico';

  switch (environment) {
    case 'local':
      return `${path}/favicon-local.${extension}`;
    case 'dev':
      return `${path}/favicon-dev.${extension}`;
    default:
      return `${path}/favicon.${extension}`;
  }
}
